import { answerVkMessageEvent, editVkMessage, sendVkMessage, setVkTypingActivity } from './vkApi.js';

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
const DONUT_PERIOD_DAYS = 30;

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

  const exitKeyboard = {
    inline: true,
    buttons: [
      [
        {
          action: {
            type: 'callback',
            label: 'Выйти в меню 🏠',
            payload: exitDialogPayload(),
          },
          color: 'primary',
        },
      ],
    ],
  };

  const result = await editVkMessage({
    token,
    peerId: eventContext.peerId,
    conversationMessageId: eventContext.conversationMessageId,
    message: updatedText,
    keyboard: exitKeyboard,
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

  const userLevel = limitCheck.level_id || 1;
  const currentSummary = await getCurrentSummary(env.DB, userId);
  const recentHistory = await getRecentHistory(env.DB, userId, HISTORY_WINDOW_SIZE);
  const modelMessages = buildDialogMessages(currentSummary, recentHistory, userText, userLevel);

  // Non-blocking typing indicator while model is generating a response.
  await setVkTypingActivity({ token: env.VK_TOKEN, peerId: userId });

  const assistantMessage = await requestOpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
    messages: modelMessages,
    reasoningEnabled: true,
  });

  const parsedReply = parseAssistantReply(assistantMessage?.content);
  const englishReply = parsedReply.en;
  let russianReply = parsedReply.ru;
  const corrections = parsedReply.corrections || '';
  const serializedReasoning = safeJsonStringify(assistantMessage?.reasoning_details);

  // Ensure translation always exists; if not provided, generate a fallback
  if (!russianReply) {
    russianReply = 'Я помогаю учить английский. Продолжай практиковаться!';
  }

  await env.DB.prepare('INSERT INTO chat_history (vk_id, role, content) VALUES (?, ?, ?)').bind(userId, 'user', userText).run();

  const assistantInsert = await env.DB
    .prepare('INSERT INTO chat_history (vk_id, role, content, translation_ru, reasoning_details) VALUES (?, ?, ?, ?, ?)')
    .bind(userId, 'assistant', englishReply, russianReply, serializedReasoning)
    .run();

  const assistantHistoryId = assistantInsert?.meta?.last_row_id || null;
  const keyboard = buildDialogKeyboard(assistantHistoryId);

  // Combine main message with corrections if present
  const fullMessage = corrections ? `${englishReply}\n\n${corrections}` : englishReply;

  await sendVkMessage({
    userId,
    groupId,
    token: env.VK_TOKEN,
    message: fullMessage,
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

function buildDialogMessages(summary, historyRows, userText, level = 1) {
  const messages = [
    {
      role: 'system',
      content: buildSystemPrompt(summary, level),
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

function buildSystemPrompt(summary, level = 1) {
  const summaryText = summary || 'Нет накопленного саммари.';
  let levelGuidance = '';

  if (level === 1) {
    levelGuidance = 'Level 1 (Novice): Use only basic vocabulary and simple sentence structures. Focus on present tense. Use short sentences. Explain all idioms.';
  } else if (level === 2) {
    levelGuidance = 'Level 2 (Basic): Use intermediate vocabulary and mix of tenses. Include some phrasal verbs. Explain any less common expressions.';
  } else {
    levelGuidance = 'Level 3 (Intermediate): Use advanced vocabulary, complex sentence structures, and varied tenses. Include idiomatic expressions. Assume comfort with English grammar.';
  }

  const correctionGuidance = [
    'CRITICAL: If the user made ANY grammatical, spelling, or vocabulary errors in their message, include a "corrections" field.',
    'In "corrections" field, write ONLY IN RUSSIAN: explain what was wrong and what is correct.',
    'Format corrections as a concise block, e.g.: "❌ Your mistake: ... ✓ Correct: ..."',
  ].join(' ');

  return [
    'You are Lexi, a professional English tutor for Russian-speaking learners.',
    levelGuidance,
    'Your goal: help learners practice English, correct errors respectfully, and provide useful explanations.',
    'Always provide both English and Russian versions of your responses.',
    'Reply strictly as a JSON object with these fields:',
    '- "en": your main reply in natural English',
    '- "ru": accurate Russian translation of your English reply',
    '- "corrections": (OPTIONAL, ONLY IF user made errors) Errors explained IN RUSSIAN ONLY',
    correctionGuidance,
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
    const corrections = String(parsed?.corrections || '').trim();

    if (en && ru) {
      return { en, ru, corrections: corrections || undefined };
    }
  } catch {
    console.warn('[TEXT_DIALOG] Модель вернула невалидный JSON, используем fallback');
  }

  const fallback = normalized || 'I am here and ready to help you practice English.';
  return {
    en: fallback,
    ru: 'Я на связи и готова помочь тебе практиковать английский.',
    corrections: undefined,
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
  const user = await db
    .prepare('SELECT subscription_tier, subscription_until, level_id FROM users_vk WHERE vk_id = ? LIMIT 1')
    .bind(userId)
    .first();
  const donutState = await getDonutAccessState(db, userId);
  const effectiveTier = resolveEffectiveTier(user, donutState);

  if (donutState.lastPaidAt || donutState.lastStopAt) {
    console.log(
      `[LIMITS] vk_id=${userId} donut_last_paid_at=${donutState.lastPaidAt || 'none'} days_since_paid=${donutState.daysSincePaid ?? 'n/a'} donut_last_stop_at=${donutState.lastStopAt || 'none'} days_since_stop=${donutState.daysSinceStop ?? 'n/a'} donut_active=${donutState.isActive} source=${donutState.source}`
    );
  } else {
    console.log(`[LIMITS] vk_id=${userId} donut_last_paid_at=none donut_active=false`);
  }

  if (effectiveTier !== (user?.subscription_tier || 'free')) {
    await db.prepare('UPDATE users_vk SET subscription_tier = ? WHERE vk_id = ?').bind(effectiveTier, userId).run();
  }

  const today = new Date().toISOString().slice(0, 10);
  const counter = await db
    .prepare('SELECT current_value FROM user_daily_counters WHERE vk_id = ? AND date_day = ? AND counter_type = ? LIMIT 1')
    .bind(userId, today, counterType)
    .first();

  const currentValue = Number(counter?.current_value || 0);
  const maxLimit = FREE_LIMITS[counterType] || 0;

  // Donut users are never limited but we still record the count for analytics.
  if (effectiveTier !== 'donut' && currentValue >= maxLimit) {
    return {
      allowed: false,
      level_id: user?.level_id || 1,
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

  return { allowed: true, level_id: user?.level_id || 1 };
}

function resolveEffectiveTier(user, donutState) {
  const currentTier = user?.subscription_tier;

  if (donutState.isActive) {
    return 'donut';
  }

  // Legacy fallback is allowed only while subscription_until is still in the future.
  if (!donutState.hasAnyEvent && currentTier === 'donut' && isFutureTimestamp(user?.subscription_until)) {
    return 'donut';
  }

  return 'free';
}

function isFutureTimestamp(value) {
  if (!value) {
    return false;
  }

  const ts = Date.parse(String(value));
  if (!Number.isFinite(ts)) {
    return false;
  }

  return ts > Date.now();
}

async function getDonutAccessState(db, userId) {
  // Guarantee the table exists — it may not if no Donut event was ever received.
  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS donut_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vk_id BIGINT NOT NULL,
        action TEXT NOT NULL,
        amount INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vk_id) REFERENCES users_vk(vk_id)
      )
    `)
    .run();

  let row = null;
  try {
    row = await db
      .prepare(`
        SELECT
          MAX(CASE WHEN action IN ('create', 'prolonged') THEN created_at END) AS last_paid_at,
          CAST((julianday('now') - julianday(MAX(CASE WHEN action IN ('create', 'prolonged') THEN created_at END))) AS REAL) AS days_since_paid,
          MAX(CASE WHEN action IN ('cancelled', 'expired') THEN created_at END) AS last_stop_at,
          CAST((julianday('now') - julianday(MAX(CASE WHEN action IN ('cancelled', 'expired') THEN created_at END))) AS REAL) AS days_since_stop,
          COUNT(*) AS total_events
        FROM donut_logs
        WHERE vk_id = ?
      `)
      .bind(userId)
      .first();
  } catch (err) {
    console.error('[DONUT_STATE] Ошибка запроса donut_logs:', err);
    return { lastPaidAt: null, lastStopAt: null, daysSincePaid: null, daysSinceStop: null, hasAnyEvent: false, isActive: false, source: 'error' };
  }

  const lastPaidAt = row?.last_paid_at || null;
  const lastStopAt = row?.last_stop_at || null;
  const daysSincePaid = Number(row?.days_since_paid);
  const daysSinceStop = Number(row?.days_since_stop);
  const hasAnyEvent = Number(row?.total_events || 0) > 0;

  const paidWindowActive = Boolean(lastPaidAt) && Number.isFinite(daysSincePaid) && daysSincePaid < DONUT_PERIOD_DAYS;
  const recoveryWindowActive = !lastPaidAt && Boolean(lastStopAt) && Number.isFinite(daysSinceStop) && daysSinceStop < DONUT_PERIOD_DAYS;

  const isActive = paidWindowActive || recoveryWindowActive;
  const source = paidWindowActive ? 'paid_event_window' : recoveryWindowActive ? 'recovery_stop_event_window' : 'none';

  return {
    lastPaidAt,
    lastStopAt,
    daysSincePaid: Number.isFinite(daysSincePaid) ? daysSincePaid.toFixed(2) : null,
    daysSinceStop: Number.isFinite(daysSinceStop) ? daysSinceStop.toFixed(2) : null,
    hasAnyEvent,
    isActive,
    source,
  };
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
