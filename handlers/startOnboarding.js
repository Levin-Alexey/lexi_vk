import { answerVkMessageEvent, editVkMessage, sendVkMessage } from '../services/vkApi.js';
import { ensureLcoinTables } from '../services/lcoinTables.js';
import { handleExistingUser } from './existingUser.js';

const SESSION_TTL_SECONDS = 86400;
const PAYLOAD_VERSION = 1;
const START_BONUS_LCOIN = 100;
const BONUS_PHOTO_ATTACHMENT = 'photo175946972_457239741_12d2424e06dbb0697a';

const LEVEL_OPTIONS = [
  { code: 'novice', label: '👶 Новичок', name: 'Новичок', description: 'Начальный уровень, базовые слова и простые фразы.' },
  { code: 'basic', label: '🚶 Базовый', name: 'Базовый', description: 'Базовое общение в бытовых ситуациях.' },
  { code: 'intermediate', label: '🏃 Средний', name: 'Средний', description: 'Уверенное общение на повседневные и рабочие темы.' },
];

const REASON_OPTIONS = [
  { key: 'work', label: '💼 Для работы / IT' },
  { key: 'travel', label: '✈️ Путешествия и переезд' },
  { key: 'study', label: '🎓 Учеба / Экзамены' },
  { key: 'fun', label: '🍿 Кино, книги, общение' },
];

const TOPIC_OPTIONS = [
  { key: 'tech', label: '💻 IT и Технологии' },
  { key: 'movies', label: '🎬 Кино, сериалы, музыка' },
  { key: 'business', label: '📈 Бизнес и финансы' },
  { key: 'games', label: '🎮 Игры и поп-культура' },
  { key: 'sport', label: '⚽️ Спорт и здоровье' },
];

export function isOnboardingCommand(payload) {
  if (!payload || payload.v !== PAYLOAD_VERSION) {
    return false;
  }

  return typeof payload.c === 'string' && payload.c.startsWith('o');
}

export async function handleStartOnboarding({ userId, groupId, token, env, eventContext }) {
  const session = {
    step: 'level',
    level_code: null,
    reason_to_learn: [],
    wants_to_improve: [],
    topics: [],
  };

  await saveSession(env, userId, session);

  return sendLevelQuestion({ userId, groupId, token, session, eventContext });
}

export async function handleOnboardingAction({ userId, groupId, token, env, command, payload }) {
  const session = (await getSession(env, userId)) || {
    step: 'level',
    level_code: null,
    reason_to_learn: [],
    wants_to_improve: [],
    topics: [],
  };

  const actionCode = command || payload?.c;

  const eventContext = {
    peerId: payload?.peerId,
    conversationMessageId: payload?.conversationMessageId,
    eventId: payload?.eventId,
    eventUserId: payload?.eventUserId,
  };

  if (actionCode === 'ol') {
    const selectedLevelCode = String(payload?.d || '');
    if (LEVEL_OPTIONS.some((option) => option.code === selectedLevelCode)) {
      session.level_code = selectedLevelCode;
      session.step = 'level';
      await saveSession(env, userId, session);
    }
    return sendLevelQuestion({ userId, groupId, token, session, eventContext });
  }

  if (actionCode === 'onl') {
    if (!session.level_code) {
      return respondWithQuestion({
        userId,
        groupId,
        token,
        eventContext,
        message: 'Сначала выберите уровень английского.',
      });
    }

    session.step = 'reasons';
    await saveSession(env, userId, session);
    return sendReasonsQuestion({ userId, groupId, token, session, eventContext });
  }

  if (actionCode === 'or') {
    session.reason_to_learn = toggleInArray(session.reason_to_learn, String(payload?.d || ''));
    session.step = 'reasons';
    await saveSession(env, userId, session);
    return sendReasonsQuestion({ userId, groupId, token, session, eventContext });
  }

  if (actionCode === 'onr') {
    if (!session.reason_to_learn || session.reason_to_learn.length === 0) {
      return respondWithQuestion({
        userId,
        groupId,
        token,
        eventContext,
        message: 'Выберите хотя бы один вариант причины и нажмите "Далее".',
      });
    }

    session.step = 'topics';
    await saveSession(env, userId, session);
    return sendTopicsQuestion({ userId, groupId, token, session, eventContext });
  }

  if (actionCode === 'ot') {
    session.topics = toggleInArray(session.topics, String(payload?.d || ''));
    session.step = 'topics';
    await saveSession(env, userId, session);
    return sendTopicsQuestion({ userId, groupId, token, session, eventContext });
  }

  if (actionCode === 'of') {
    if (!session.topics || session.topics.length === 0) {
      return respondWithQuestion({
        userId,
        groupId,
        token,
        eventContext,
        message: 'Выберите хотя бы одну тему и нажмите "Завершить настройку".',
      });
    }

    await ensureLevelsTable(env.DB);
    await ensureLcoinTables(env.DB);
    await saveOnboardingResult(env.DB, userId, session);
    await deleteSession(env, userId);

    await answerEvent(eventContext, token, 'Настройка завершена');
    await sendWelcomeBonusMessage({ userId, groupId, token });

    return handleExistingUser({ userId, groupId, token });
  }

  return respondWithQuestion({
    userId,
    groupId,
    token,
    eventContext,
    message: 'Неизвестная команда onboarding. Нажмите "Начнем?" чтобы начать заново.',
  });
}

export function onboardingPayload(command, data) {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: command,
    d: data,
  });
}

function sessionKey(userId) {
  return `onboard_${userId}`;
}

async function getSession(env, userId) {
  return env.KV.get(sessionKey(userId), { type: 'json' });
}

async function saveSession(env, userId, session) {
  await env.KV.put(sessionKey(userId), JSON.stringify(session), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
}

async function deleteSession(env, userId) {
  await env.KV.delete(sessionKey(userId));
}

function toggleInArray(input, item) {
  if (!item) {
    return Array.isArray(input) ? input : [];
  }

  const values = Array.isArray(input) ? [...input] : [];
  const index = values.indexOf(item);
  if (index >= 0) {
    values.splice(index, 1);
  } else {
    values.push(item);
  }
  return values;
}

function markSelected(label, isSelected) {
  return isSelected ? `✅ ${label}` : label;
}

function buildLevelKeyboard(session) {
  const rows = LEVEL_OPTIONS.map((option) => [{
    action: {
      type: 'callback',
      label: markSelected(option.label, session.level_code === option.code),
      payload: onboardingPayload('ol', option.code),
    },
    color: 'secondary',
  }]);

  rows.push([{
    action: {
      type: 'callback',
      label: '➡️ Далее',
      payload: onboardingPayload('onl'),
    },
    color: 'primary',
  }]);

  return {
    inline: true,
    buttons: rows,
  };
}

function buildReasonsKeyboard(session) {
  const selected = Array.isArray(session.reason_to_learn) ? session.reason_to_learn : [];
  const rows = REASON_OPTIONS.map((option) => [{
    action: {
      type: 'callback',
      label: markSelected(option.label, selected.includes(option.key)),
      payload: onboardingPayload('or', option.key),
    },
    color: 'secondary',
  }]);

  rows.push([{
    action: {
      type: 'callback',
      label: '➡️ Далее',
      payload: onboardingPayload('onr'),
    },
    color: 'primary',
  }]);

  return {
    inline: true,
    buttons: rows,
  };
}

function buildTopicsKeyboard(session) {
  const selected = Array.isArray(session.topics) ? session.topics : [];
  const rows = TOPIC_OPTIONS.map((option) => [{
    action: {
      type: 'callback',
      label: markSelected(option.label, selected.includes(option.key)),
      payload: onboardingPayload('ot', option.key),
    },
    color: 'secondary',
  }]);

  rows.push([{
    action: {
      type: 'callback',
      label: '✅ Завершить настройку',
      payload: onboardingPayload('of'),
    },
    color: 'positive',
  }]);

  return {
    inline: true,
    buttons: rows,
  };
}

function sendLevelQuestion({ userId, groupId, token, session, eventContext }) {
  return respondWithQuestion({
    userId,
    groupId,
    token,
    eventContext,
    message: 'Для начала выберите Ваш текущий уровень английского:',
    keyboard: buildLevelKeyboard(session),
  });
}

function sendReasonsQuestion({ userId, groupId, token, session, eventContext }) {
  return respondWithQuestion({
    userId,
    groupId,
    token,
    eventContext,
    message: 'Отлично! Для чего Вам нужен английский? (Выберите один или несколько вариантов и нажмите "Далее")',
    keyboard: buildReasonsKeyboard(session),
  });
}

function sendTopicsQuestion({ userId, groupId, token, session, eventContext }) {
  return respondWithQuestion({
    userId,
    groupId,
    token,
    eventContext,
    message: 'И последнее! Чтобы наши диалоги и уроки были нескучными, выбери темы, которые тебе интересны:',
    keyboard: buildTopicsKeyboard(session),
  });
}

async function respondWithQuestion({ userId, groupId, token, eventContext, message, keyboard, attachment }) {
  if (eventContext?.peerId && eventContext?.conversationMessageId) {
    const result = await editVkMessage({
      token,
      peerId: eventContext.peerId,
      conversationMessageId: eventContext.conversationMessageId,
      message,
      keyboard,
      attachment,
    });

    await answerEvent(eventContext, token, result.ok ? 'Обновлено' : 'Ошибка обновления');
    if (result.ok) {
      return result;
    }
  }

  return sendVkMessage({
    userId,
    groupId,
    token,
    message,
    keyboard,
    attachment,
  });
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

async function ensureLevelsTable(db) {
  if (!db) {
    console.error('[D1_ERROR] DB binding отсутствует при работе с levels');
    return;
  }

  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS levels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT,
        name TEXT NOT NULL,
        description TEXT
      )
    `)
    .run();

  const tableInfo = await db.prepare('PRAGMA table_info(levels)').all();
  const hasCode = (tableInfo.results || []).some((column) => column.name === 'code');

  if (!hasCode) {
    await db.prepare('ALTER TABLE levels ADD COLUMN code TEXT').run();
  }

  await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_levels_code ON levels(code)').run();

  await db
    .prepare('INSERT OR IGNORE INTO levels (id, code, name, description) VALUES (?, ?, ?, ?)')
    .bind(1, 'novice', 'Новичок', LEVEL_OPTIONS[0].description)
    .run();
  await db
    .prepare('INSERT OR IGNORE INTO levels (id, code, name, description) VALUES (?, ?, ?, ?)')
    .bind(2, 'basic', 'Базовый', LEVEL_OPTIONS[1].description)
    .run();
  await db
    .prepare('INSERT OR IGNORE INTO levels (id, code, name, description) VALUES (?, ?, ?, ?)')
    .bind(3, 'intermediate', 'Средний', LEVEL_OPTIONS[2].description)
    .run();

  await db
    .prepare('UPDATE levels SET code = ? WHERE id = ? AND (code IS NULL OR code = \'\')')
    .bind('novice', 1)
    .run();
  await db
    .prepare('UPDATE levels SET code = ? WHERE id = ? AND (code IS NULL OR code = \'\')')
    .bind('basic', 2)
    .run();
  await db
    .prepare('UPDATE levels SET code = ? WHERE id = ? AND (code IS NULL OR code = \'\')')
    .bind('intermediate', 3)
    .run();
}

async function saveOnboardingResult(db, vkId, session) {
  if (!db) {
    console.error('[D1_ERROR] DB binding отсутствует при сохранении onboarding');
    return;
  }

  const reasonToLearn = Array.isArray(session.reason_to_learn) ? session.reason_to_learn : [];
  const wantsToImprove = Array.isArray(session.wants_to_improve) ? session.wants_to_improve : [];
  const topics = Array.isArray(session.topics) ? session.topics : [];

  const levelRow = await db
    .prepare('SELECT id FROM levels WHERE code = ? LIMIT 1')
    .bind(session.level_code)
    .first();

  const levelId = levelRow?.id || null;

  const hasWelcomeBalance = await db
    .prepare('SELECT vk_id FROM user_balances WHERE vk_id = ? LIMIT 1')
    .bind(vkId)
    .first();

  const statements = [
    db
      .prepare(`
        INSERT INTO users_vk (vk_id, level_id, reason_to_learn, wants_to_improve, topics)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(vk_id) DO UPDATE SET
          level_id = excluded.level_id,
          reason_to_learn = excluded.reason_to_learn,
          wants_to_improve = excluded.wants_to_improve,
          topics = excluded.topics
      `)
      .bind(
        vkId,
        levelId,
        JSON.stringify(reasonToLearn),
        JSON.stringify(wantsToImprove),
        JSON.stringify(topics)
      ),
  ];

  if (!hasWelcomeBalance) {
    statements.push(
      db
        .prepare('INSERT INTO user_balances (vk_id, balance) VALUES (?, ?)')
        .bind(vkId, START_BONUS_LCOIN),
      db
        .prepare('INSERT INTO coin_transactions (vk_id, amount, transaction_type, reason) VALUES (?, ?, ?, ?)')
        .bind(vkId, START_BONUS_LCOIN, 'earn', 'welcome_bonus')
    );
  }

  await db.batch(statements);
}

async function sendWelcomeBonusMessage({ userId, groupId, token }) {
  const message = [
    'Поздравляю! 🎉🥳🎊🎁',
    'Вам начислены приветственные 100 LCoins.',
    'Это внутренняя валюта, которую можно будет тратить на мерч, бонусы и другие полезные подарки.',
  ].join('\n');

  return sendVkMessage({
    userId,
    groupId,
    token,
    attachment: BONUS_PHOTO_ATTACHMENT,
    message,
  });
}
