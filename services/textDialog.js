import { answerVkMessageEvent, editVkMessage, sendVkMessage } from './vkApi.js';

const PAYLOAD_VERSION = 1;
const SHOW_TRANSLATION_COMMAND = 'show_translation';
const EXIT_DIALOG_COMMAND = 'exit_text_dialog';
const TEXT_DIALOG_STATE_PREFIX = 'dialog_mode_';
const TEXT_DIALOG_STATE = 'text_dialog';
const TEXT_COUNTER_TYPE = 'text_msg';
const FREE_LIMITS = {
  text_msg: 5,
};
const HISTORY_WINDOW_SIZE = 12;
const HISTORY_COMPRESS_THRESHOLD = 16;
const HISTORY_RETAIN_COUNT = 6;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'deepseek/deepseek-v4-flash';

export async function activateTextDialog(env, userId) {
  if (!env?.KV) {
    return;
  }

  await env.KV.put(`${TEXT_DIALOG_STATE_PREFIX}${userId}`, TEXT_DIALOG_STATE);
}

export async function deactivateTextDialog(env, userId) {
  if (!env?.KV) {
    return;
  }

  await env.KV.delete(`${TEXT_DIALOG_STATE_PREFIX}${userId}`);
}

export async function isTextDialogActive(env, userId) {
  if (!env?.KV) {
    return false;
  }

  const state = await env.KV.get(`${TEXT_DIALOG_STATE_PREFIX}${userId}`);
  return state === TEXT_DIALOG_STATE;
}

export async function enqueueTextDialogMessage({ env, userId, groupId, text }) {
  const normalizedText = String(text || '').trim();
  if (!normalizedText || !env?.TEXT_TASKS) {
    return false;
  }

  await env.TEXT_TASKS.send({
    type: 'text_dialog_message',
    userId,
    groupId,
    text: normalizedText,
    queuedAt: new Date().toISOString(),
  });

  return true;
}

export function isShowTranslationCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === SHOW_TRANSLATION_COMMAND;
}

export function isExitDialogCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === EXIT_DIALOG_COMMAND;
}

export function translationPayload(historyId) {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: SHOW_TRANSLATION_COMMAND,
    d: historyId,
  });
}

export function exitDialogPayload() {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: EXIT_DIALOG_COMMAND,
  });
}

export async function revealAssistantTranslation({ env, token, payload, eventContext }) {
  await ensureDialogTables(env?.DB);

  const historyId = Number(payload?.d);
  if (!Number.isInteger(historyId) || historyId <= 0) {
    await answerEvent(eventContext, token, 'Перевод не найден');
    return { ok: false, reason: 'invalid_history_id' };
  }

  const historyRow = await env.DB
    .prepare('SELECT content, translation_ru, translation_shown FROM chat_history WHERE id = ? AND role = ? LIMIT 1')
    .bind(historyId, 'assistant')
    .first();

  if (!historyRow?.content || !historyRow?.translation_ru) {
    await answerEvent(eventContext, token, 'Перевод не найден');
    return { ok: false, reason: 'translation_missing' };
  }

  const updatedText = [
    historyRow.content,
    '',
    'Перевод:',
    historyRow.translation_ru,
  ].join('\n');

  const result = await editVkMessage({
    token,
    peerId: eventContext.peerId,
    conversationMessageId: eventContext.conversationMessageId,
    message: updatedText,
    keyboard: { buttons: [] },
  });

  if (result.ok && !historyRow.translation_shown) {
    await env.DB.prepare('UPDATE chat_history SET translation_shown = 1 WHERE id = ?').bind(historyId).run();
  }

  await answerEvent(eventContext, token, result.ok ? 'Перевод показан' : 'Не удалось показать перевод');
  return result;
}

export async function processTextQueueMessage(body, env) {
  const userId = Number(body?.userId);
  const groupId = Number(body?.groupId);
  const userText = String(body?.text || '').trim();

  if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(groupId) || groupId <= 0 || !userText) {
    console.warn('[TEXT_DIALOG] Пропуск невалидного задания очереди', JSON.stringify(body));
    return { ok: false, reason: 'invalid_body' };
  }

  if (!env?.VK_TOKEN) {
    console.error('[TEXT_DIALOG] VK_TOKEN не задан');
    return { ok: false, reason: 'missing_vk_token' };
  }

  if (!env?.OPENROUTER_API_KEY) {
    console.error('[TEXT_DIALOG] OPENROUTER_API_KEY не задан');
    await sendVkMessage({
      userId,
      groupId,
      token: env.VK_TOKEN,
      message: 'Сервис диалога временно недоступен. Попробуй написать чуть позже.',
    });
    return { ok: false, reason: 'missing_openrouter_key' };
  }

  await ensureDialogTables(env.DB);
  await env.DB.prepare('INSERT OR IGNORE INTO users_vk (vk_id) VALUES (?)').bind(userId).run();

  const limitCheck = await checkAndIncrementLimit(env.DB, userId, TEXT_COUNTER_TYPE);
  if (!limitCheck.allowed) {
    await sendVkMessage({
      userId,
      groupId,
      token: env.VK_TOKEN,
      message: limitCheck.message,
    });
    return { ok: false, reason: 'daily_limit_reached' };
  }

  const currentSummary = await getCurrentSummary(env.DB, userId);
  const recentHistory = await getRecentHistory(env.DB, userId, HISTORY_WINDOW_SIZE);
  const modelMessages = buildDialogMessages(currentSummary, recentHistory, userText);

  const assistantMessage = await requestOpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
    messages: modelMessages,
    reasoningEnabled: true,
  });

  const parsedReply = parseAssistantReply(assistantMessage?.content);
  const englishReply = parsedReply.en;
  const russianReply = parsedReply.ru;
  const serializedReasoning = safeJsonStringify(assistantMessage?.reasoning_details);

  await env.DB.prepare('INSERT INTO chat_history (vk_id, role, content) VALUES (?, ?, ?)').bind(userId, 'user', userText).run();

  const assistantInsert = await env.DB
    .prepare('INSERT INTO chat_history (vk_id, role, content, translation_ru, reasoning_details) VALUES (?, ?, ?, ?, ?)')
    .bind(userId, 'assistant', englishReply, russianReply, serializedReasoning)
    .run();

  const assistantHistoryId = assistantInsert?.meta?.last_row_id || null;
  const keyboard = buildDialogKeyboard(assistantHistoryId);

  await sendVkMessage({
    userId,
    groupId,
    token: env.VK_TOKEN,
    message: englishReply,
    keyboard,
  });

  await compressHistoryIfNeeded(env.DB, env.OPENROUTER_API_KEY, userId);
  return { ok: true };
}

async function ensureDialogTables(db) {
  if (!db) {
    console.error('[D1_ERROR] DB binding отсутствует при работе с text dialog');
    return;
  }

  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vk_id BIGINT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vk_id) REFERENCES users_vk(vk_id)
      )
    `)
    .run();

  await ensureChatHistoryColumn(db, 'translation_ru', 'TEXT');
  await ensureChatHistoryColumn(db, 'reasoning_details', 'TEXT');
  await ensureChatHistoryColumn(db, 'translation_shown', 'INTEGER NOT NULL DEFAULT 0');

  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS user_memory (
        vk_id BIGINT PRIMARY KEY,
        context_summary TEXT DEFAULT '',
        last_compressed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vk_id) REFERENCES users_vk(vk_id)
      )
    `)
    .run();

  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS user_daily_counters (
        vk_id BIGINT NOT NULL,
        date_day DATE DEFAULT (CURRENT_DATE),
        counter_type TEXT NOT NULL,
        current_value INTEGER DEFAULT 0,
        PRIMARY KEY (vk_id, date_day, counter_type),
        FOREIGN KEY (vk_id) REFERENCES users_vk(vk_id)
      )
    `)
    .run();
}

async function ensureChatHistoryColumn(db, columnName, sqlType) {
  const tableInfo = await db.prepare('PRAGMA table_info(chat_history)').all();
  const columns = (tableInfo.results || []).map((column) => column.name);

  if (!columns.includes(columnName)) {
    await db.prepare(`ALTER TABLE chat_history ADD COLUMN ${columnName} ${sqlType}`).run();
  }
}

async function getCurrentSummary(db, userId) {
  const row = await db.prepare('SELECT context_summary FROM user_memory WHERE vk_id = ? LIMIT 1').bind(userId).first();
  return row?.context_summary || '';
}

async function getRecentHistory(db, userId, limit) {
  const result = await db
    .prepare('SELECT role, content, reasoning_details FROM chat_history WHERE vk_id = ? ORDER BY id DESC LIMIT ?')
    .bind(userId, limit)
    .all();

  return (result.results || []).reverse();
}

function buildDialogMessages(summary, historyRows, userText) {
  const messages = [
    {
      role: 'system',
      content: buildSystemPrompt(summary),
    },
  ];

  for (const row of historyRows) {
    const historyMessage = {
      role: row.role,
      content: row.content,
    };

    if (row.role === 'assistant' && row.reasoning_details) {
      try {
        historyMessage.reasoning_details = JSON.parse(row.reasoning_details);
      } catch {
        console.warn('[TEXT_DIALOG] Не удалось распарсить reasoning_details из истории');
      }
    }

    messages.push(historyMessage);
  }

  messages.push({
    role: 'user',
    content: userText,
  });

  return messages;
}

function buildSystemPrompt(summary) {
  const summaryText = summary || 'Нет накопленного саммари.';
  return [
    'You are Lexi, a warm and concise AI English tutor for Russian-speaking users.',
    'Use the stored conversation summary to adapt tone, pace, and examples.',
    'Reply strictly as a JSON object with two string fields: "en" and "ru".',
    'Field "en" must contain your main reply in natural English.',
    'Field "ru" must contain an accurate Russian translation of the English reply.',
    'Keep the answer useful, conversational, and not too long.',
    `Conversation summary: ${summaryText}`,
  ].join(' ');
}

async function requestOpenRouter({ apiKey, messages, reasoningEnabled }) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      reasoning: reasoningEnabled ? { enabled: true } : undefined,
    }),
  });

  const rawBody = await response.text();
  let data = null;

  try {
    data = JSON.parse(rawBody);
  } catch {
    throw new Error(`OpenRouter returned non-JSON response: ${rawBody}`);
  }

  if (!response.ok || data?.error) {
    throw new Error(`OpenRouter request failed: ${data?.error?.message || rawBody}`);
  }

  const message = data?.choices?.[0]?.message;
  if (!message?.content) {
    throw new Error('OpenRouter response does not contain assistant content');
  }

  return message;
}

function parseAssistantReply(rawContent) {
  const normalized = stripCodeFences(String(rawContent || '').trim());

  try {
    const parsed = JSON.parse(normalized);
    const en = String(parsed?.en || '').trim();
    const ru = String(parsed?.ru || '').trim();

    if (en && ru) {
      return { en, ru };
    }
  } catch {
    console.warn('[TEXT_DIALOG] Модель вернула невалидный JSON, используем fallback');
  }

  const fallback = normalized || 'I am here and ready to help you practice English.';
  return {
    en: fallback,
    ru: 'Я на связи и готова помочь тебе практиковать английский.',
  };
}

function stripCodeFences(input) {
  if (input.startsWith('```')) {
    return input.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
  }

  return input;
}

function buildDialogKeyboard(historyId) {
  const buttons = [];

  if (historyId) {
    buttons.push([
      {
        action: {
          type: 'callback',
          label: 'Показать перевод 🇷🇺',
          payload: translationPayload(historyId),
        },
        color: 'secondary',
      },
    ]);
  }

  buttons.push([
    {
      action: {
        type: 'callback',
        label: 'Выйти в меню 🏠',
        payload: exitDialogPayload(),
      },
      color: 'primary',
    },
  ]);

  return {
    inline: true,
    buttons,
  };
}

async function checkAndIncrementLimit(db, userId, counterType) {
  const user = await db.prepare('SELECT subscription_tier FROM users_vk WHERE vk_id = ? LIMIT 1').bind(userId).first();
  const donutState = await db
    .prepare('SELECT action FROM donut_logs WHERE vk_id = ? ORDER BY created_at DESC, id DESC LIMIT 1')
    .bind(userId)
    .first();

  const effectiveTier = resolveEffectiveTier(user?.subscription_tier, donutState?.action);
  if (effectiveTier !== (user?.subscription_tier || 'free')) {
    await db.prepare('UPDATE users_vk SET subscription_tier = ? WHERE vk_id = ?').bind(effectiveTier, userId).run();
  }

  if (effectiveTier === 'donut') {
    return { allowed: true };
  }

  const today = new Date().toISOString().slice(0, 10);
  const counter = await db
    .prepare('SELECT current_value FROM user_daily_counters WHERE vk_id = ? AND date_day = ? AND counter_type = ? LIMIT 1')
    .bind(userId, today, counterType)
    .first();

  const currentValue = Number(counter?.current_value || 0);
  const maxLimit = FREE_LIMITS[counterType] || 0;

  if (currentValue >= maxLimit) {
    return {
      allowed: false,
      message: [
        'На сегодня лимит бесплатных сообщений закончился.',
        '',
        'Для бесплатного режима доступно 5 текстовых ответов в день.',
        'Оформи VK Donut, чтобы снять ограничения и общаться с Lexi без лимита.',
      ].join('\n'),
    };
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

  return { allowed: true };
}

function resolveEffectiveTier(currentTier, latestDonutAction) {
  if (latestDonutAction === 'create' || latestDonutAction === 'prolonged') {
    return 'donut';
  }

  if (latestDonutAction === 'expired' || latestDonutAction === 'cancelled') {
    return 'free';
  }

  return currentTier === 'donut' ? 'donut' : 'free';
}

async function compressHistoryIfNeeded(db, apiKey, userId) {
  const countRow = await db.prepare('SELECT COUNT(*) AS total FROM chat_history WHERE vk_id = ?').bind(userId).first();
  const total = Number(countRow?.total || 0);

  if (total <= HISTORY_COMPRESS_THRESHOLD) {
    return;
  }

  const allHistory = await db
    .prepare('SELECT id, role, content FROM chat_history WHERE vk_id = ? ORDER BY id ASC')
    .bind(userId)
    .all();

  const historyRows = allHistory.results || [];
  const rowsToCompress = historyRows.slice(0, Math.max(0, historyRows.length - HISTORY_RETAIN_COUNT));
  if (rowsToCompress.length === 0) {
    return;
  }

  const currentSummary = await getCurrentSummary(db, userId);
  const chunkText = rowsToCompress.map((row) => `${row.role}: ${row.content}`).join('\n');

  const summaryMessage = await requestOpenRouter({
    apiKey,
    reasoningEnabled: false,
    messages: [
      {
        role: 'system',
        content: 'You maintain a concise summary of a student\'s English tutoring chat. Reply with plain text, 3-4 short sentences, focused on goals, preferences, repeated mistakes, and active topics.',
      },
      {
        role: 'user',
        content: `Current summary:\n${currentSummary || 'No previous summary.'}\n\nNew chat chunk:\n${chunkText}`,
      },
    ],
  });

  const nextSummary = String(summaryMessage.content || '').trim();
  if (!nextSummary) {
    return;
  }

  await db
    .prepare(`
      INSERT INTO user_memory (vk_id, context_summary, last_compressed_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(vk_id)
      DO UPDATE SET
        context_summary = excluded.context_summary,
        last_compressed_at = CURRENT_TIMESTAMP
    `)
    .bind(userId, nextSummary)
    .run();

  const idsToDelete = rowsToCompress.map((row) => row.id);
  const placeholders = idsToDelete.map(() => '?').join(', ');
  await db.prepare(`DELETE FROM chat_history WHERE id IN (${placeholders})`).bind(...idsToDelete).run();
}

function safeJsonStringify(value) {
  if (value === undefined || value === null) {
    return null;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

async function answerEvent(eventContext, token, text) {
  if (!eventContext?.eventId) {
    return;
  }

  await answerVkMessageEvent({
    token,
    eventId: eventContext.eventId,
    userId: eventContext.eventUserId,
    peerId: eventContext.peerId,
    text,
  });
}
