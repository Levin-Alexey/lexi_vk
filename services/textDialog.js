import { answerVkMessageEvent, editVkMessage, sendVkMessage, setVkTypingActivity } from './vkApi.js';
import { sendLcoinRewardMessage } from '../handlers/lcoinMessages.js';
import { registerMetricProgress } from './lcoinEngine.js';

const PAYLOAD_VERSION = 1;
const SHOW_TRANSLATION_COMMAND = 'show_translation';
const EXIT_DIALOG_COMMAND = 'exit_text_dialog';
const SHOW_TARIFFS_COMMAND = 'show_tariffs';
const TEXT_DIALOG_STATE_PREFIX = 'dialog_mode_';
const TEXT_DIALOG_STATE = 'text_dialog';
const TEXT_COUNTER_TYPE = 'text_msg';

// Daily message limits per subscription tier.
const TIER_LIMITS = { free: 5, tier1: 50, tier2: 100, tier3: 150 };
const HISTORY_WINDOW_SIZE = 12;
const HISTORY_COMPRESS_THRESHOLD = 16;
const HISTORY_RETAIN_COUNT = 6;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'deepseek/deepseek-v4-pro'; // Исправлено на актуальную модель V3
const DONUT_PERIOD_DAYS = 30;

// ============================================================================
// УПРАВЛЕНИЕ СОСТОЯНИЯМИ И ОЧЕРЕДЬЮ
// ============================================================================

export async function activateTextDialog(env, userId) {
  if (env?.KV) await env.KV.put(`${TEXT_DIALOG_STATE_PREFIX}${userId}`, TEXT_DIALOG_STATE);
}

export async function deactivateTextDialog(env, userId) {
  if (env?.KV) await env.KV.delete(`${TEXT_DIALOG_STATE_PREFIX}${userId}`);
}

export async function isTextDialogActive(env, userId) {
  if (!env?.KV) return false;
  return (await env.KV.get(`${TEXT_DIALOG_STATE_PREFIX}${userId}`)) === TEXT_DIALOG_STATE;
}

export async function enqueueTextDialogMessage({ env, userId, groupId, text }) {
  const normalizedText = String(text || '').trim();
  if (!normalizedText || !env?.TEXT_TASKS) return false;

  await env.TEXT_TASKS.send({ type: 'text_dialog_message', userId, groupId, text: normalizedText, queuedAt: new Date().toISOString() });
  return true;
}

// ============================================================================
// PAYLOADS И CALLBACK-КНОПКИ
// ============================================================================

export const isShowTranslationCommand = (p) => p?.v === PAYLOAD_VERSION && p?.c === SHOW_TRANSLATION_COMMAND;
export const isExitDialogCommand = (p) => p?.v === PAYLOAD_VERSION && p?.c === EXIT_DIALOG_COMMAND;
export const translationPayload = (d) => JSON.stringify({ v: PAYLOAD_VERSION, c: SHOW_TRANSLATION_COMMAND, d });
export const exitDialogPayload = () => JSON.stringify({ v: PAYLOAD_VERSION, c: EXIT_DIALOG_COMMAND });
export const showTariffsPayload = () => JSON.stringify({ v: PAYLOAD_VERSION, c: SHOW_TARIFFS_COMMAND });

export function buildChooseTariffKeyboard() {
  return { inline: true, buttons: [[{ action: { type: 'callback', label: 'Выбрать тариф', payload: showTariffsPayload() }, color: 'primary' }]] };
}

export async function revealAssistantTranslation({ env, token, payload, eventContext }) {
  const historyId = Number(payload?.d);
  if (!historyId) {
    await answerEvent(eventContext, token, 'Ошибка данных');
    return { ok: false };
  }

  const row = await env.DB.prepare('SELECT content, translation_ru, translation_shown FROM chat_history WHERE id = ? AND role = ?').bind(historyId, 'assistant').first();
  if (!row?.content || !row?.translation_ru) {
    await answerEvent(eventContext, token, 'Перевод не найден');
    return { ok: false };
  }

  const updatedText = `${row.content}\n\n🇷🇺 Перевод:\n${row.translation_ru}`;
  const result = await editVkMessage({
    token, peerId: eventContext.peerId, conversationMessageId: eventContext.conversationMessageId,
    message: updatedText, keyboard: { inline: true, buttons: [] }
  });

  if (result.ok && !row.translation_shown) {
    await env.DB.prepare('UPDATE chat_history SET translation_shown = 1 WHERE id = ?').bind(historyId).run();
  }

  await answerEvent(eventContext, token, result.ok ? 'Перевод показан' : 'Ошибка');
  return result;
}

// ============================================================================
// ГЛАВНЫЙ ПРОЦЕССОР ТЕКСТОВЫХ СООБЩЕНИЙ
// ============================================================================

export async function processTextQueueMessage(body, env) {
  const { userId, groupId, text: userText } = body;

  if (!env?.OPENROUTER_API_KEY) {
    await sendVkMessage({ userId, groupId, token: env.VK_TOKEN, message: 'Сервис диалога временно недоступен.' });
    return { ok: false };
  }

  // 1. Проверка лимитов и Lcoin (Асинхронно обновляет счетчики)
  const limitCheck = await checkAndIncrementLimit(env.DB, userId, TEXT_COUNTER_TYPE);
  if (!limitCheck.allowed) {
    await sendVkMessage({ userId, groupId, token: env.VK_TOKEN, message: limitCheck.message, keyboard: limitCheck.keyboard });
    return { ok: false };
  }

  if (limitCheck.rewardProgress?.earned > 0) {
    await sendLcoinRewardMessage({ userId, groupId, token: env.VK_TOKEN, ...limitCheck.rewardProgress });
  }

  await setVkTypingActivity({ token: env.VK_TOKEN, peerId: userId });

  // 2. Достаем контекст (Память и история)
  const [summaryRow, historyRows] = await Promise.all([
    env.DB.prepare('SELECT context_summary FROM user_memory WHERE vk_id = ? LIMIT 1').bind(userId).first(),
    env.DB.prepare('SELECT role, content FROM chat_history WHERE vk_id = ? ORDER BY id DESC LIMIT ?').bind(userId, HISTORY_WINDOW_SIZE).all()
  ]);

  const summary = summaryRow?.context_summary || '';
  const recentHistory = (historyRows.results || []).reverse();
  const modelMessages = buildDialogMessages(summary, recentHistory, userText, limitCheck.level_id);

  // 3. Запрос к LLM (со строгим JSON)
  const assistantReply = await requestOpenRouter({ apiKey: env.OPENROUTER_API_KEY, messages: modelMessages });
  
  // 4. Пакетная запись (Batch) в БД
  const batchResults = await env.DB.batch([
    env.DB.prepare('INSERT INTO chat_history (vk_id, role, content) VALUES (?, ?, ?)').bind(userId, 'user', userText),
    env.DB.prepare('INSERT INTO chat_history (vk_id, role, content, translation_ru) VALUES (?, ?, ?, ?)').bind(userId, 'assistant', assistantReply.en, assistantReply.ru)
  ]);
  const assistantHistoryId = batchResults[1].meta.last_row_id;

  // 5. Отправка ответа
  const fullMessage = assistantReply.corrections ? `${assistantReply.en}\n\n💡 ${assistantReply.corrections}` : assistantReply.en;
  
  await sendVkMessage({
    userId, groupId, token: env.VK_TOKEN, message: fullMessage,
    keyboard: { inline: true, buttons: [[{ action: { type: 'callback', label: 'Показать перевод 🇷🇺', payload: translationPayload(assistantHistoryId) }, color: 'secondary' }]] }
  });

  // 6. Фоновое сжатие
  await compressHistoryIfNeeded(env.DB, env.OPENROUTER_API_KEY, userId);
  return { ok: true };
}

// ============================================================================
// ЛИМИТЫ И VK DONUT
// ============================================================================

async function checkAndIncrementLimit(db, userId, counterType) {
  const user = await db.prepare('SELECT subscription_tier, level_id FROM users_vk WHERE vk_id = ? LIMIT 1').bind(userId).first();
  const donutState = await getDonutAccessState(db, userId);
  const effectiveTier = (donutState.isActive && user?.subscription_tier !== 'free') ? user.subscription_tier : 'free';

  if (effectiveTier !== (user?.subscription_tier || 'free')) {
    await db.prepare('UPDATE users_vk SET subscription_tier = ? WHERE vk_id = ?').bind(effectiveTier, userId).run();
  }

  const today = new Date().toISOString().slice(0, 10);
  const counter = await db.prepare('SELECT current_value FROM user_daily_counters WHERE vk_id = ? AND date_day = ? AND counter_type = ?').bind(userId, today, counterType).first();
  const currentValue = Number(counter?.current_value || 0);
  const maxLimit = TIER_LIMITS[effectiveTier] ?? TIER_LIMITS.free;

  if (currentValue >= maxLimit) {
    const isFree = effectiveTier === 'free';
    const message = isFree 
      ? `На сегодня лимит бесплатных сообщений (${maxLimit}) закончился.\nОформи VK Donut, чтобы общаться без лимита.`
      : `Твой дневной лимит (${maxLimit} сообщений) исчерпан.\nОн обновится завтра.`;
    return { allowed: false, level_id: user?.level_id || 1, message, keyboard: buildChooseTariffKeyboard() };
  }

  await db.prepare(`INSERT INTO user_daily_counters (vk_id, date_day, counter_type, current_value) VALUES (?, ?, ?, 1) ON CONFLICT(vk_id, date_day, counter_type) DO UPDATE SET current_value = current_value + 1`).bind(userId, today, counterType).run();

  const rewardProgress = await registerMetricProgress(db, userId, counterType);
  return { allowed: true, level_id: user?.level_id || 1, rewardProgress };
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
  } catch (err) {
    return { isActive: false };
  }
}

// ============================================================================
// LLM И ПРОМПТЫ
// ============================================================================

function buildDialogMessages(summary, historyRows, userText, level = 1) {
  const levelGuidance = level === 1 ? 'Level 1: Very simple A1-A2 vocabulary, short sentences.' 
    : level === 2 ? 'Level 2: A2-B1 vocabulary, mix of tenses.' 
    : 'Level 3: B1-B2 vocabulary, idiomatic expressions.';

  const systemPrompt = `You are Lexi, a professional English teacher and personal language coach for Russian-speaking learners.

PERSONALITY:
- Be warm, patient, supportive, and attentive.
- Help the learner feel safe to make mistakes and keep practicing.
- Explain clearly and kindly, never shame the learner.

CORE BEHAVIOR:
- Always answer the latest user message directly.
- Use memory only as supporting context; never replace latest intent.
- Keep replies practical, clear, and useful for progress.

TEXT-DIALOG RULE (CRITICAL):
- Treat this as a text chat conversation.
- Prefer writing-related verbs and phrasing: "write", "type", "send", "text", "rewrite", "message".
- Avoid speaking-first wording like "say", "speak", "pronounce" in normal replies.
- EXCEPTION: when you intentionally ask for memorization practice, you may ask the learner to repeat or say a phrase aloud.

ENGAGEMENT RULE (MANDATORY):
- Every English reply must end with one clear question to keep the dialogue going.

LEVEL ADAPTATION:
- ${levelGuidance}

MEMORY CONTEXT:
LONG-TERM MEMORY: ${summary || 'None'}

OUTPUT CONTRACT (STRICT JSON ONLY):
{
  "en": "Your final English tutor reply for text dialogue, ending with a question.",
  "ru": "Accurate Russian translation of en.",
  "corrections": "If user made real grammar/spelling/vocabulary mistakes, provide a short explanation in Russian. If no real mistakes, return ''."
}

Return only valid JSON. No markdown. No extra keys.`;

  const messages = [{ role: 'system', content: systemPrompt }];
  for (const row of historyRows) messages.push({ role: row.role, content: row.content });
  messages.push({ role: 'user', content: userText });
  
  return messages;
}

async function requestOpenRouter({ apiKey, messages }) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      response_format: { type: "json_object" }, // Принудительный JSON
      messages
    })
  });

  const rawBody = await response.text();
  let data = null;

  try {
    data = JSON.parse(rawBody);
  } catch {
    return normalizeTextReply(null);
  }

  if (!response.ok || data?.error) {
    return normalizeTextReply(null);
  }

  try {
    const parsed = JSON.parse(String(data?.choices?.[0]?.message?.content || '{}'));
    return normalizeTextReply(parsed);
  } catch {
    return normalizeTextReply(null);
  }
}

function normalizeTextReply(parsed) {
  let en = String(parsed?.en || '').trim();
  const ru = String(parsed?.ru || '').trim();
  const corrections = String(parsed?.corrections || '').trim();

  if (!en) {
    en = 'Great, let us keep practicing in text. What would you like to write next?';
  }

  if (!/[?]\s*$/.test(en)) {
    en = `${en.replace(/[.!]+\s*$/, '').trim()}?`;
  }

  return {
    en,
    ru: ru || 'Отлично, давай продолжим практику в текстовом формате. Что ты хочешь написать дальше?',
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
  const chunkText = rowsToCompress.map(r => `${r.role}: ${r.content}`).join('\n');

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: 'You maintain a concise summary of a student tutoring chat. Reply with 3-4 sentences in English.' },
        { role: 'user', content: `Current summary:\n${oldSummaryRow?.context_summary || 'None'}\n\nNew chat:\n${chunkText}` }
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

async function answerEvent(eventContext, token, text) {
  if (eventContext?.eventId) {
    await answerVkMessageEvent({ token, eventId: eventContext.eventId, userId: eventContext.eventUserId, peerId: eventContext.peerId, text });
  }
}