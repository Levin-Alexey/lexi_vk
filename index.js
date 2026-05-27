import { handleStartOnboarding } from './handlers/startOnboarding.js';
import { sendVkMessage } from './services/vkApi.js';

const CONFIRMATION_CODE = '02c2fafa';
const WELCOME_VIDEO_ATTACHMENT = 'video-230370533_456239020';

const firstVisitKeyboard = {
  inline: true,
  buttons: [
    [
      {
        action: {
          type: 'text',
          label: 'Начнем?',
          payload: JSON.stringify({ command: 'start_onboarding' }),
        },
        color: 'primary',
      },
    ],
  ],
};

const returningKeyboard = {
  inline: true,
  buttons: [
    [
      {
        action: {
          type: 'text',
          label: 'Продолжить',
          payload: JSON.stringify({ command: 'start_onboarding' }),
        },
        color: 'primary',
      },
    ],
  ],
};

export default {
  async fetch(request, env) {
    console.log('[RECV] Входящий запрос:', request.method, request.url);

    if (request.method !== 'POST') {
      console.log('[REJECT] Не POST запрос');
      return new Response('Method Not Allowed', { status: 405 });
    }

    let payload = null;
    try {
      payload = await request.json();
      console.log('[RECV] JSON payload:', JSON.stringify(payload));
    } catch (error) {
      console.log('[ERROR] Не валидный JSON:', error);
      return new Response('Bad Request', { status: 400 });
    }

    // TODO этап 2: добавить строгую проверку секрета callback API.
    console.log('[INFO] Проверка безопасности пропущена (добавим позже)');

    if (payload.type === 'confirmation') {
      console.log('[CONFIRM] Отправляем confirmation');
      return new Response(CONFIRMATION_CODE, {
        status: 200,
        headers: {
          'content-type': 'text/plain',
        },
      });
    }

    if (payload.type === 'message_new') {
      const message = payload?.object?.message;
      if (!message || !message.from_id) {
        console.log('[SKIP] Нет данных message.from_id');
        return okResponse();
      }

      const userId = Number(message.from_id);
      const text = (message.text || '').trim();
      const groupId = payload.group_id;
      const parsedPayload = parseMessagePayload(message.payload);

      console.log(`[MESSAGE] От ${userId}: "${text}"`);
      console.log(`[TOKEN] VK_TOKEN установлен: ${env.VK_TOKEN ? 'ДА' : 'НЕТ'}`);

      if (!env.VK_TOKEN) {
        console.error('[ERROR] VK_TOKEN не задан в секретах окружения');
        return okResponse();
      }

      await ensureUsersTable(env.DB);
      const user = await getUserByVkId(env.DB, userId);
      const isFirstVisit = !user;

      if (isFirstVisit) {
        await createUser(env.DB, userId);
      }

      if (isStartOnboarding(text, parsedPayload)) {
        await handleStartOnboarding({ userId, groupId, token: env.VK_TOKEN });
        return okResponse();
      }

      if (text.toLowerCase() === 'очистить' || text.toLowerCase() === 'clear') {
        await clearKeyboard(userId, 'Клавиатура удалена', env.VK_TOKEN, groupId);
      } else {
        if (isFirstVisit) {
          await sendFirstVisitMessage(userId, env.VK_TOKEN, groupId);
        } else {
          await sendReturningUserMessage(userId, env.VK_TOKEN, groupId);
        }
      }
    }

    return okResponse();
  },
};

function okResponse() {
  return new Response('ok', {
    status: 200,
    headers: {
      'content-type': 'text/plain',
    },
  });
}

function parseMessagePayload(rawPayload) {
  if (!rawPayload) {
    return null;
  }

  try {
    return typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
  } catch {
    return null;
  }
}

function isStartOnboarding(text, payload) {
  const normalizedText = (text || '').trim().toLowerCase();
  return payload?.command === 'start_onboarding' || normalizedText === 'начнем' || normalizedText === 'начнём';
}

async function ensureUsersTable(db) {
  if (!db) {
    console.error('[D1_ERROR] DB binding отсутствует');
    return;
  }

  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS users_vk (
          vk_id BIGINT PRIMARY KEY,
          domain TEXT,
          first_name TEXT,
          last_name TEXT,
          date_joined TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          streak INTEGER DEFAULT 0,
          max_streak INTEGER DEFAULT 0,
          progress TEXT,
          reason_to_learn TEXT,
          wants_to_improve TEXT,
          topics TEXT,
          last_request_date DATE DEFAULT CURRENT_DATE,
          requests_today_podcast INTEGER DEFAULT 0,
          requests_today INTEGER DEFAULT 0,
          level_id INTEGER,
          subscription_tier TEXT,
          subscription_until TIMESTAMP,
          last_notification_sent TIMESTAMP,
          lexi_style TEXT DEFAULT 'futurist',
          FOREIGN KEY (level_id) REFERENCES levels(id)
      )
    `)
    .run();
}

async function getUserByVkId(db, vkId) {
  if (!db) {
    return null;
  }

  const result = await db
    .prepare('SELECT vk_id, date_joined FROM users_vk WHERE vk_id = ? LIMIT 1')
    .bind(vkId)
    .first();

  return result || null;
}

async function createUser(db, vkId) {
  if (!db) {
    return;
  }

  await db.prepare('INSERT OR IGNORE INTO users_vk (vk_id) VALUES (?)').bind(vkId).run();
}

async function sendFirstVisitMessage(userId, token, groupId) {
  const message = [
    'Добро пожаловать!',
    'Чтобы обучение было действительно полезным, я сначала задам Вам несколько простых вопросов.',
    'Это поможет понять Ваш уровень, цель изучения английского и темы, которые Вы хотите прокачать в первую очередь.',
    '',
    'Ответьте на 3 коротких блока - и я подберу персональный старт обучения.',
    '',
    'Начнем?',
  ].join('\n');

  return sendVkMessage({
    userId,
    groupId,
    token,
    message,
    attachment: WELCOME_VIDEO_ATTACHMENT,
    keyboard: firstVisitKeyboard,
  });
}

async function sendReturningUserMessage(userId, token, groupId) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: 'С возвращением! Продолжим персональное обучение английскому.',
    keyboard: returningKeyboard,
  });
}

async function clearKeyboard(userId, text, token, groupId) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: text,
    keyboard: { buttons: [] },
  });
}
