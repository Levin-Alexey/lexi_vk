import { answerVkMessageEvent, editVkMessage, sendVkMessage, sendVkVoiceMessageFromMp3, setVkTypingActivity } from './vkApi.js';
import { sendLcoinRewardMessage } from '../handlers/lcoinMessages.js';
import { registerMetricProgress } from './lcoinEngine.js';

const PAYLOAD_VERSION = 1;
const VOICE_REVEAL_EN_COMMAND = 'voice_show_en';
const VOICE_REVEAL_RU_COMMAND = 'voice_show_ru';
const SHOW_TARIFFS_COMMAND = 'show_tariffs';
const VOICE_DIALOG_STATE_PREFIX = 'dialog_mode_';
const VOICE_DIALOG_STATE = 'voice_dialog';
const VOICE_MAX_DURATION_SECONDS = 45;

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENAI_STT_URL = 'https://api.openai.com/v1/audio/transcriptions';
const OPENAI_AUDIO_SPEECH_URL = 'https://api.openai.com/v1/audio/speech';

const OPENROUTER_REPLY_MODEL = 'deepseek/deepseek-chat'; // V3 - идеален для этого промпта
const OPENAI_TTS_MODEL = 'tts-1'; // Самый быстрый и дешевый для озвучки
const OPENAI_TTS_VOICE = 'nova';

const VOICE_COUNTER_TYPE = 'voice_msg';
const VOICE_TIER_LIMITS = { free: 3, tier1: 20, tier2: 30, tier3: 50 };
const DONUT_PERIOD_DAYS = 30;
const HISTORY_COMPRESS_THRESHOLD = 16;
const HISTORY_RETAIN_COUNT = 6;

// ============================================================================
// УПРАВЛЕНИЕ СОСТОЯНИЯМИ И ОЧЕРЕДЬЮ
// ============================================================================

export async function activateVoiceDialog(env, userId) {
  if (env?.KV) await env.KV.put(`${VOICE_DIALOG_STATE_PREFIX}${userId}`, VOICE_DIALOG_STATE);
}

export async function deactivateVoiceDialog(env, userId) {
  if (env?.KV) await env.KV.delete(`${VOICE_DIALOG_STATE_PREFIX}${userId}`);
}

export async function isVoiceDialogActive(env, userId) {
  if (!env?.KV) return false;
  return (await env.KV.get(`${VOICE_DIALOG_STATE_PREFIX}${userId}`)) === VOICE_DIALOG_STATE;
}

export async function enqueueVoiceDialogMessage({ env, userId, groupId, linkMp3, duration }) {
  if (!env?.VOICE_TASKS || !linkMp3) return false;
  await env.VOICE_TASKS.send({
    type: 'voice_dialog_message',
    userId,
    groupId,
    linkMp3,
    duration: Number(duration) || 0,
    queuedAt: new Date().toISOString(),
  });
  return true;
}

// ============================================================================
// ОБРАБОТКА CALLBACK-КНОПОК ПЕРЕВОДА
// ============================================================================

export function isVoiceRevealCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && (payload?.c === VOICE_REVEAL_EN_COMMAND || payload?.c === VOICE_REVEAL_RU_COMMAND);
}

export async function handleVoiceRevealEvent({ env, token, payload, eventContext }) {
  const historyId = Number(payload?.d);
  if (!historyId || !isVoiceRevealCommand(payload)) {
    await answerEvent(eventContext, token, 'Ошибка данных');
    return { ok: false };
  }

  const row = await env.DB.prepare('SELECT en_text, ru_text, en_shown, ru_shown FROM voice_reply_history WHERE id = ?').bind(historyId).first();
  if (!row) {
    await answerEvent(eventContext, token, 'Ответ не найден в истории');
    return { ok: false };
  }

  const nextEnShown = payload.c === VOICE_REVEAL_EN_COMMAND ? 1 : row.en_shown;
  const nextRuShown = payload.c === VOICE_REVEAL_RU_COMMAND ? 1 : row.ru_shown;

  const updatedText = buildVoiceRevealText(row.en_text, row.ru_text, nextEnShown === 1, nextRuShown === 1);
  const keyboard = buildVoiceRevealKeyboard(historyId, nextEnShown === 1, nextRuShown === 1);

  const result = await editVkMessage({
    token, peerId: eventContext.peerId, conversationMessageId: eventContext.conversationMessageId,
    message: updatedText, keyboard,
  });

  if (result.ok) {
    await env.DB.prepare('UPDATE voice_reply_history SET en_shown = ?, ru_shown = ? WHERE id = ?')
      .bind(nextEnShown, nextRuShown, historyId).run();
  }

  await answerEvent(eventContext, token, 'Текст открыт');
  return result;
}

// ============================================================================
// ГЛАВНЫЙ ПРОЦЕССОР ГОЛОСОВЫХ СООБЩЕНИЙ (QUEUE CONSUMER)
// ============================================================================

export async function processVoiceQueueMessage(body, env) {
  const { userId, groupId, linkMp3, duration } = body;

  await env.DB.prepare('INSERT OR IGNORE INTO users_vk (vk_id) VALUES (?)').bind(userId).run();

  const limitCheck = await checkAndIncrementVoiceLimit(env.DB, userId, VOICE_COUNTER_TYPE);
  if (!limitCheck.allowed) {
    await sendVkMessage({
      userId,
      groupId,
      token: env.VK_TOKEN,
      message: limitCheck.message,
      keyboard: limitCheck.keyboard,
    });
    return { ok: false, reason: 'voice_daily_limit_reached' };
  }

  if (limitCheck.rewardProgress?.earned > 0) {
    await sendLcoinRewardMessage({ userId, groupId, token: env.VK_TOKEN, ...limitCheck.rewardProgress });
  }

  if (duration > VOICE_MAX_DURATION_SECONDS) {
    await sendVkMessage({ userId, groupId, token: env.VK_TOKEN, message: `Сообщение слишком длинное 🫶 (макс. ${VOICE_MAX_DURATION_SECONDS} сек).` });
    return { ok: false };
  }

  await setVkTypingActivity({ token: env.VK_TOKEN, peerId: userId });

  try {
    // 1. Скачиваем аудио и распознаем через OpenAI Whisper
    const audioBuffer = await downloadAudio(linkMp3);
    if (!audioBuffer) throw new Error('Download failed');
    
    const transcript = await transcribeAudioOpenAI(env.OPENAI_API_KEY, audioBuffer);
    if (!transcript) {
      await sendVkMessage({ userId, groupId, token: env.VK_TOKEN, message: 'Не удалось распознать голос. Попробуйте еще раз четче.' });
      return { ok: false };
    }

    // 2. Достаем память и уровень одним Batch-запросом для скорости
    const [levelRow, summaryRow, historyRows] = await Promise.all([
      env.DB.prepare('SELECT level_id FROM users_vk WHERE vk_id = ? LIMIT 1').bind(userId).first(),
      env.DB.prepare('SELECT context_summary FROM user_memory WHERE vk_id = ? LIMIT 1').bind(userId).first(),
      env.DB.prepare('SELECT role, content FROM chat_history WHERE vk_id = ? ORDER BY id DESC LIMIT 4').bind(userId).all()
    ]);

    const level = Number(levelRow?.level_id) || 1;
    const summary = summaryRow?.context_summary || '';
    const memoryLines = (historyRows.results || []).reverse().map(r => `${r.role}: ${r.content}`);

    // 3. УЛЬТИМАТИВНЫЙ ПРОМПТ К LLM (1 запрос вместо 4-х)
    const replyData = await generateUltimateReply(env.OPENROUTER_API_KEY, transcript, summary, memoryLines, level);

    // 4. Озвучиваем ответ через OpenAI TTS
    const voiceAudio = await synthesizeEnglishAudio(env.OPENAI_API_KEY, replyData.en);

    // 5. Записываем ВСЮ историю в БД за ОДИН Batch-запрос
    const batchResults = await env.DB.batch([
      env.DB.prepare('INSERT INTO chat_history (vk_id, role, content) VALUES (?, ?, ?)').bind(userId, 'user', transcript),
      env.DB.prepare('INSERT INTO chat_history (vk_id, role, content, translation_ru) VALUES (?, ?, ?, ?)').bind(userId, 'assistant', replyData.en, replyData.ru),
      env.DB.prepare('INSERT INTO voice_reply_history (vk_id, en_text, ru_text, transcript_text, corrections_text) VALUES (?, ?, ?, ?, ?)').bind(userId, replyData.en, replyData.ru, transcript, replyData.corrections)
    ]);
    const historyId = batchResults[2].meta.last_row_id;

    // 6. Отправка сообщений пользователю в VK
    if (voiceAudio) {
      const voiceSendResult = await sendVkVoiceMessageFromMp3({
        userId, groupId, token: env.VK_TOKEN,
        mp3Bytes: voiceAudio.bytes, mimeType: voiceAudio.mimeType, fileName: voiceAudio.fileName,
      });
      if (!voiceSendResult?.ok) await sendVkMessage({ userId, groupId, token: env.VK_TOKEN, message: replyData.en });
    } else {
      await sendVkMessage({ userId, groupId, token: env.VK_TOKEN, message: replyData.en });
    }

    if (replyData.corrections) {
      await sendVkMessage({ userId, groupId, token: env.VK_TOKEN, message: `💡 Разбор ошибки:\n${replyData.corrections}` });
    }

    await sendVkMessage({
      userId, groupId, token: env.VK_TOKEN,
      message: buildVoiceRevealText(replyData.en, replyData.ru, false, false),
      keyboard: buildVoiceRevealKeyboard(historyId, false, false),
    });

    // 7. Фоновое сжатие истории
    await compressHistoryIfNeeded(env.DB, env.OPENROUTER_API_KEY, userId);

    return { ok: true };
  } catch (error) {
    console.error('[VOICE_DIALOG] Ошибка обработки:', error);
    await sendVkMessage({ userId, groupId, token: env.VK_TOKEN, message: 'Произошла ошибка при обработке сообщения 😔' });
    return { ok: false };
  }
}

async function checkAndIncrementVoiceLimit(db, userId, counterType) {
  const user = await db.prepare('SELECT subscription_tier FROM users_vk WHERE vk_id = ? LIMIT 1').bind(userId).first();
  const donutState = await getDonutAccessState(db, userId);
  const effectiveTier = (donutState.isActive && user?.subscription_tier !== 'free') ? user.subscription_tier : 'free';

  if (effectiveTier !== (user?.subscription_tier || 'free')) {
    await db.prepare('UPDATE users_vk SET subscription_tier = ? WHERE vk_id = ?').bind(effectiveTier, userId).run();
  }

  const today = new Date().toISOString().slice(0, 10);
  const counter = await db
    .prepare('SELECT current_value FROM user_daily_counters WHERE vk_id = ? AND date_day = ? AND counter_type = ?')
    .bind(userId, today, counterType)
    .first();

  const currentValue = Number(counter?.current_value || 0);
  const maxLimit = VOICE_TIER_LIMITS[effectiveTier] ?? VOICE_TIER_LIMITS.free;

  if (currentValue >= maxLimit) {
    const isFree = effectiveTier === 'free';
    const message = isFree
      ? `На сегодня лимит голосовых сообщений (${maxLimit}) закончился. Оформи подписку, чтобы увеличить лимит.`
      : `Твой дневной лимит голосовых сообщений (${maxLimit}) исчерпан. Он обновится завтра.`;
    return { allowed: false, message, keyboard: buildChooseTariffKeyboard() };
  }

  await db
    .prepare(`
      INSERT INTO user_daily_counters (vk_id, date_day, counter_type, current_value)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(vk_id, date_day, counter_type)
      DO UPDATE SET current_value = current_value + 1
    `)
    .bind(userId, today, counterType)
    .run();

  const rewardProgress = await registerMetricProgress(db, userId, counterType);
  return { allowed: true, rewardProgress };
}

async function getDonutAccessState(db, userId) {
  try {
    const row = await db.prepare(`
      SELECT
        MAX(CASE WHEN action IN ('create', 'prolonged') THEN created_at END) AS last_paid_at,
        CAST((julianday('now') - julianday(MAX(CASE WHEN action IN ('create', 'prolonged') THEN created_at END))) AS REAL) AS days_since_paid,
        MAX(CASE WHEN action IN ('cancelled', 'expired') THEN created_at END) AS last_stop_at,
        CAST((julianday('now') - julianday(MAX(CASE WHEN action IN ('cancelled', 'expired') THEN created_at END))) AS REAL) AS days_since_stop
      FROM donut_logs WHERE vk_id = ?
    `).bind(userId).first();

    const paidActive = row?.last_paid_at && row.days_since_paid < DONUT_PERIOD_DAYS;
    const recoveryActive = !row?.last_paid_at && row?.last_stop_at && row.days_since_stop < DONUT_PERIOD_DAYS;
    return { isActive: paidActive || recoveryActive };
  } catch {
    return { isActive: false };
  }
}

function showTariffsPayload() {
  return JSON.stringify({ v: PAYLOAD_VERSION, c: SHOW_TARIFFS_COMMAND });
}

function buildChooseTariffKeyboard() {
  return {
    inline: true,
    buttons: [
      [
        {
          action: {
            type: 'callback',
            label: 'Выбрать тариф',
            payload: showTariffsPayload(),
          },
          color: 'primary',
        },
      ],
    ],
  };
}

// ============================================================================
// API ИНТЕГРАЦИИ (OPENAI & OPENROUTER)
// ============================================================================

async function transcribeAudioOpenAI(apiKey, audioBuffer) {
  // Нативная работа с FormData в Cloudflare Workers
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  formData.append('file', blob, 'voice.mp3');
  formData.append('model', 'whisper-1');

  const response = await fetch(OPENAI_STT_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` }, // boundary установится автоматически
    body: formData
  });

  if (!response.ok) throw new Error(`OpenAI STT failed: ${response.statusText}`);
  const data = await response.json();
  return String(data?.text || '').trim();
}

async function synthesizeEnglishAudio(apiKey, text) {
  if (!text || !apiKey) return null;
  const response = await fetch(OPENAI_AUDIO_SPEECH_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OPENAI_TTS_MODEL, voice: OPENAI_TTS_VOICE, input: text, response_format: 'mp3' }),
  });

  if (!response.ok) return null;
  return { bytes: new Uint8Array(await response.arrayBuffer()), mimeType: 'audio/mpeg', fileName: 'reply.mp3' };
}

async function generateUltimateReply(apiKey, transcript, summary, memoryLines, level) {
  const levelRule = level <= 1
    ? 'Use VERY simple A1-A2 vocabulary. Max 1-2 short sentences. No idioms.'
    : level === 2
    ? 'Use everyday A2-B1 vocabulary. 2-3 short sentences.'
    : 'Use natural B1-B2 vocabulary. Keep it conversational.';

  const systemPrompt = `You are Lexi, a professional English teacher and personal language coach for Russian-speaking learners.

PERSONALITY:
- Be warm, patient, supportive, and emotionally attentive.
- Encourage progress and reduce fear of mistakes.
- Explain clearly, never shame the learner.

CORE BEHAVIOR:
- Always answer the user's latest message directly.
- Use memory only as context; never ignore or replace the latest user intent.
- Keep replies practical and useful for active learning.

VOICE-DIALOG RULE (CRITICAL):
- Treat this as a voice-message tutoring dialogue where the learner replies by voice.
- Prefer spoken-action verbs and phrasing: "say", "tell", "speak", "repeat", "pronounce", "answer aloud", "send a voice message".
- Keep guidance natural for oral practice and short voice exchanges.
- Avoid writing-first wording like "type", "write", "text" unless absolutely necessary.
- Exception: when a short written example is useful, keep it minimal and return to voice-first instructions.

CORRECTIONS DELIVERY RULE (CRITICAL):
- Even in voice mode, corrections are delivered to the learner as a TEXT block.
- Write corrections in Russian, concise and actionable (1-3 short lines).
- You may include pronunciation feedback when it is clearly inferred from the user's utterance.
- If pronunciation is uncertain, do not invent it; focus on grammar/vocabulary only.

ENGAGEMENT RULE (MANDATORY):
- Every English reply MUST end with one clear, motivating question that invites the learner to continue.
- Exactly one final question mark at the end is preferred.

LEVEL ADAPTATION:
- ${levelRule}

MEMORY CONTEXT:
LONG-TERM MEMORY: ${summary || 'None'}
SHORT-TERM MEMORY:
${memoryLines.join('\n')}

OUTPUT CONTRACT (STRICT JSON ONLY):
{
  "en": "Your final English tutor reply for voice dialogue, natural for speaking practice, ending with a question.",
  "ru": "Accurate Russian translation of en.",
  "corrections": "If user made real grammar/spelling/vocabulary mistakes, provide a short explanation in Russian. If no real mistake, return ''."
}

Do not add markdown, commentary, or extra keys. Return only a valid JSON object.`;

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENROUTER_REPLY_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript }
      ]
    })
  });

  const rawBody = await response.text();
  let data = null;

  try {
    data = JSON.parse(rawBody);
  } catch {
    return normalizeVoiceReply(null);
  }

  if (!response.ok || data?.error) {
    return normalizeVoiceReply(null);
  }

  try {
    const parsed = JSON.parse(String(data?.choices?.[0]?.message?.content || '{}'));
    return normalizeVoiceReply(parsed);
  } catch {
    return normalizeVoiceReply(null);
  }
}

function normalizeVoiceReply(parsed) {
  let en = String(parsed?.en || '').trim();
  const ru = String(parsed?.ru || '').trim();
  const corrections = String(parsed?.corrections || '').trim();

  if (!en) {
    en = 'Great, let us continue practicing together. What would you like to talk about next?';
  }

  if (!/[?]\s*$/.test(en)) {
    en = `${en.replace(/[.!]+\s*$/, '').trim()}?`;
  }

  return {
    en,
    ru: ru || 'Отлично, давай продолжим практику. О чем ты хочешь поговорить дальше?',
    corrections,
  };
}

async function compressHistoryIfNeeded(db, apiKey, userId) {
  const countRow = await db.prepare('SELECT COUNT(*) AS total FROM chat_history WHERE vk_id = ?').bind(userId).first();
  if (Number(countRow?.total || 0) <= HISTORY_COMPRESS_THRESHOLD) return;

  const allHistory = await db.prepare('SELECT id, role, content FROM chat_history WHERE vk_id = ? ORDER BY id ASC').bind(userId).all();
  const rowsToCompress = (allHistory.results || []).slice(0, -HISTORY_RETAIN_COUNT);
  if (rowsToCompress.length === 0) return;

  const oldSummaryRow = await db.prepare('SELECT context_summary FROM user_memory WHERE vk_id = ? LIMIT 1').bind(userId).first();
  const oldSummary = oldSummaryRow?.context_summary || '';
  const chunkText = rowsToCompress.map(r => `${r.role}: ${r.content}`).join('\n');

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENROUTER_REPLY_MODEL,
      messages: [
        { role: 'system', content: 'You maintain a concise summary of a student tutoring chat. Reply with 3-4 sentences in English.' },
        { role: 'user', content: `Current summary:\n${oldSummary}\n\nNew chat:\n${chunkText}` }
      ]
    })
  });

  const data = await response.json();
  const nextSummary = String(data?.choices?.[0]?.message?.content || '').trim();

  if (nextSummary) {
    await db.prepare('INSERT INTO user_memory (vk_id, context_summary) VALUES (?, ?) ON CONFLICT(vk_id) DO UPDATE SET context_summary = excluded.context_summary').bind(userId, nextSummary).run();
    const ids = rowsToCompress.map(r => r.id);
    await db.prepare(`DELETE FROM chat_history WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).run();
  }
}

// ============================================================================
// УТИЛИТЫ И ХЕЛПЕРЫ
// ============================================================================

async function downloadAudio(url) {
  try {
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch { return null; }
}

async function answerEvent(eventContext, token, text) {
  if (eventContext?.eventId) {
    await answerVkMessageEvent({ token, eventId: eventContext.eventId, userId: eventContext.eventUserId, peerId: eventContext.peerId, text });
  }
}

function buildVoiceRevealText(enText, ruText, enShown, ruShown) {
  return [
    'Готово. Можно раскрыть текст ответа ниже:', '',
    enShown ? `🇬🇧 На английском:\n${enText}` : '🇬🇧 На английском: скрыт', '',
    ruShown ? `🇷🇺 Перевод:\n${ruText}` : '🇷🇺 Перевод: скрыт'
  ].join('\n');
}

function buildVoiceRevealKeyboard(historyId, enShown, ruShown) {
  const buttons = [];
  if (!enShown) buttons.push([{ action: { type: 'callback', label: 'Показать текст', payload: JSON.stringify({ v: PAYLOAD_VERSION, c: VOICE_REVEAL_EN_COMMAND, d: historyId }) }, color: 'primary' }]);
  if (!ruShown) buttons.push([{ action: { type: 'callback', label: 'Показать перевод', payload: JSON.stringify({ v: PAYLOAD_VERSION, c: VOICE_REVEAL_RU_COMMAND, d: historyId }) }, color: 'secondary' }]);
  return { inline: true, buttons };
}