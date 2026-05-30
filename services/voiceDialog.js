import { answerVkMessageEvent, editVkMessage, sendVkMessage, sendVkVoiceMessageFromMp3, setVkTypingActivity } from './vkApi.js';

const PAYLOAD_VERSION = 1;
const VOICE_REVEAL_EN_COMMAND = 'voice_show_en';
const VOICE_REVEAL_RU_COMMAND = 'voice_show_ru';
const VOICE_DIALOG_STATE_PREFIX = 'dialog_mode_';
const VOICE_DIALOG_STATE = 'voice_dialog';
const VOICE_MAX_DURATION_SECONDS = 45;

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENAI_STT_URL = 'https://api.openai.com/v1/audio/transcriptions';
const OPENAI_AUDIO_SPEECH_URL = 'https://api.openai.com/v1/audio/speech';

const OPENROUTER_REPLY_MODEL = 'deepseek/deepseek-chat'; // V3 - идеален для этого промпта
const OPENAI_TTS_MODEL = 'tts-1'; // Самый быстрый и дешевый для озвучки
const OPENAI_TTS_VOICE = 'nova';

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

  const systemPrompt = `You are Lexi, a friendly English tutor.
Always answer the user's latest message directly. Use memory only for context.

LONG-TERM MEMORY: ${summary || 'None'}
SHORT-TERM MEMORY:
${memoryLines.join('\n')}

OUTPUT STRICTLY IN JSON FORMAT:
{
  "en": "Your spoken English reply to the user. ${levelRule}",
  "ru": "Accurate Russian translation of your reply.",
  "corrections": "If user made grammar/pronunciation mistakes, explain them briefly in Russian. If no mistakes, output an empty string ''."
}`;

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

  const data = await response.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch (e) {
    return { en: "I understood you, let's keep going!", ru: "Я поняла тебя, продолжаем!", corrections: "" };
  }
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