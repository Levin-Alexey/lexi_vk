import { handleOnboardingAction, handleStartOnboarding, isOnboardingCommand, onboardingPayload } from './handlers/startOnboarding.js';
import { handleExistingUser } from './handlers/existingUser.js';
import { handleLexiChat, handleLexiMainMenu, isLexiChatCommand, isLexiMainMenuCommand } from './handlers/lexiChat.js';
import { handleLexiVoice, isLexiVoiceCommand } from './handlers/chat/lexiVoice.js';
import { handleLexiVoiceDialog, isLexiVoiceDialogCommand } from './handlers/chat/lexiVoiceDialog.js';
import { handleLexiText, isLexiTextCommand } from './handlers/chat/lexiText.js';
import { handleLexiDialog, isLexiDialogCommand } from './handlers/chat/lexiDialog.js';
import { handleProfileMenu, isProfileButtonText } from './handlers/main_menu/profile.js';
import { handleReturnMainMenu, isReturnMainMenuButtonText } from './handlers/main_menu/returnMainMenu.js';
import { handleSettingsInfoMenu, isSettingsInfoButtonText } from './handlers/main_menu/settingsInfo.js';
import { handleShowTariffs, isShowTariffsCommand } from './handlers/serviceMessages.js';
import { handleDonutEvent, isDonutEvent } from './handlers/donutEvents.js';
import { handleQueueBatch } from './handlers/queueHandler.js';
import { deactivateTextDialog, enqueueTextDialogMessage, isExitDialogCommand, isShowTranslationCommand, isTextDialogActive, revealAssistantTranslation } from './services/textDialog.js';
import { deactivateVoiceDialog, enqueueVoiceDialogMessage, handleVoiceRevealEvent, isVoiceDialogActive, isVoiceRevealCommand } from './services/voiceDialog.js';
import { answerVkMessageEvent, sendVkMessage } from './services/vkApi.js';

const CONFIRMATION_CODE = '02c2fafa';
const WELCOME_VIDEO_ATTACHMENT = 'video-230370533_456239021';

const firstVisitKeyboard = {
  inline: true,
  buttons: [
    [
      {
        action: {
          type: 'callback',
          label: 'Начнем?🥳',
          payload: onboardingPayload('os'),
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

    if (payload.type !== 'confirmation') {
      const secretValidation = validateVkCallbackSecret(payload, env);
      if (!secretValidation.ok) {
        console.error(`[SECURITY] 403 для event=${payload.type} secret_in_payload="${payload?.secret}" configured=${Boolean(env.VK_CALLBACK_SECRET || env.VK_SECRET)}`);
        return new Response('Forbidden', { status: 403 });
      }
    }

    if (payload.type === 'confirmation') {
      console.log('[CONFIRM] Отправляем confirmation');
      return new Response(CONFIRMATION_CODE, {
        status: 200,
        headers: {
          'content-type': 'text/plain',
        },
      });
    }

    if (isDonutEvent(payload.type)) {
      await ensureUsersTable(env.DB);
      await handleDonutEvent(payload, env);
      return okResponse();
    }

    if (payload.type === 'message_event') {
      const eventObject = payload?.object;
      const eventPayload = parseMessagePayload(eventObject?.payload);
      const userId = Number(eventObject?.user_id);
      const groupId = payload.group_id;

      if (!userId || !eventPayload) {
        return okResponse();
      }

      if (!env.VK_TOKEN) {
        console.error('[ERROR] VK_TOKEN не задан в секретах окружения');
        return okResponse();
      }

      await ensureUsersTable(env.DB);

      const eventContext = {
        peerId: Number(eventObject?.peer_id),
        conversationMessageId: Number(eventObject?.conversation_message_id),
        eventId: eventObject?.event_id,
        eventUserId: userId,
      };

      if (eventPayload?.v === 1 && eventPayload?.c === 'os') {
        // Старт опроса отдельным сообщением, чтобы не затирать приветственный экран.
        await handleStartOnboarding({ userId, groupId, token: env.VK_TOKEN, env });
        await answerVkMessageEvent({
          token: env.VK_TOKEN,
          eventId: eventContext.eventId,
          userId,
          peerId: eventContext.peerId,
          text: 'Опрос начат',
        });
        return okResponse();
      }

      if (isLexiChatCommand(eventPayload)) {
        await handleLexiChat({ userId, groupId, token: env.VK_TOKEN });
        await answerVkMessageEvent({ token: env.VK_TOKEN, eventId: eventContext.eventId, userId, peerId: eventContext.peerId });
        return okResponse();
      }

      if (isLexiVoiceCommand(eventPayload)) {
        await handleLexiVoice({ userId, groupId, token: env.VK_TOKEN });
        await answerVkMessageEvent({ token: env.VK_TOKEN, eventId: eventContext.eventId, userId, peerId: eventContext.peerId });
        return okResponse();
      }

      if (isLexiTextCommand(eventPayload)) {
        await handleLexiText({ userId, groupId, token: env.VK_TOKEN });
        await answerVkMessageEvent({ token: env.VK_TOKEN, eventId: eventContext.eventId, userId, peerId: eventContext.peerId });
        return okResponse();
      }

      if (isLexiVoiceDialogCommand(eventPayload)) {
        await handleLexiVoiceDialog({ userId, groupId, token: env.VK_TOKEN, env });
        await answerVkMessageEvent({ token: env.VK_TOKEN, eventId: eventContext.eventId, userId, peerId: eventContext.peerId });
        return okResponse();
      }

      if (isLexiDialogCommand(eventPayload)) {
        await handleLexiDialog({ userId, groupId, token: env.VK_TOKEN, env });
        await answerVkMessageEvent({ token: env.VK_TOKEN, eventId: eventContext.eventId, userId, peerId: eventContext.peerId });
        return okResponse();
      }

      if (isShowTariffsCommand(eventPayload)) {
        await handleShowTariffs({ userId, groupId, token: env.VK_TOKEN });
        await answerVkMessageEvent({ token: env.VK_TOKEN, eventId: eventContext.eventId, userId, peerId: eventContext.peerId });
        return okResponse();
      }

      if (isShowTranslationCommand(eventPayload)) {
        await revealAssistantTranslation({
          env,
          token: env.VK_TOKEN,
          payload: eventPayload,
          eventContext,
        });
        return okResponse();
      }

      if (isVoiceRevealCommand(eventPayload)) {
        await handleVoiceRevealEvent({
          env,
          token: env.VK_TOKEN,
          payload: eventPayload,
          eventContext,
        });
        return okResponse();
      }

      if (isExitDialogCommand(eventPayload)) {
        await deactivateTextDialog(env, userId);
        await handleLexiMainMenu({ userId, groupId, token: env.VK_TOKEN });
        await answerVkMessageEvent({ token: env.VK_TOKEN, eventId: eventContext.eventId, userId, peerId: eventContext.peerId, text: 'Диалог завершен' });
        return okResponse();
      }

      if (isLexiMainMenuCommand(eventPayload)) {
        await deactivateTextDialog(env, userId);
        await handleLexiMainMenu({ userId, groupId, token: env.VK_TOKEN });
        await answerVkMessageEvent({ token: env.VK_TOKEN, eventId: eventContext.eventId, userId, peerId: eventContext.peerId });
        return okResponse();
      }

      if (isOnboardingCommand(eventPayload)) {
        await handleOnboardingAction({
          userId,
          groupId,
          token: env.VK_TOKEN,
          env,
          command: eventPayload.c,
          payload: {
            ...eventPayload,
            peerId: eventContext.peerId,
            conversationMessageId: eventContext.conversationMessageId,
            eventId: eventContext.eventId,
            eventUserId: eventContext.eventUserId,
          },
        });
      }

      return okResponse();
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

      const onboardingCommand = parsedPayload?.c;

      if (isStartOnboarding(text, parsedPayload)) {
        await handleStartOnboarding({ userId, groupId, token: env.VK_TOKEN, env });
        return okResponse();
      }

      if (isOnboardingCommand(parsedPayload)) {
        await handleOnboardingAction({
          userId,
          groupId,
          token: env.VK_TOKEN,
          env,
          command: onboardingCommand,
          payload: parsedPayload,
        });
        return okResponse();
      }

      if (isLexiChatCommand(parsedPayload)) {
        await handleLexiChat({ userId, groupId, token: env.VK_TOKEN });
        return okResponse();
      }

      if (isLexiVoiceCommand(parsedPayload)) {
        await handleLexiVoice({ userId, groupId, token: env.VK_TOKEN });
        return okResponse();
      }

      if (isLexiTextCommand(parsedPayload)) {
        await handleLexiText({ userId, groupId, token: env.VK_TOKEN });
        return okResponse();
      }

      if (isLexiVoiceDialogCommand(parsedPayload)) {
        await handleLexiVoiceDialog({ userId, groupId, token: env.VK_TOKEN, env });
        return okResponse();
      }

      if (isLexiMainMenuCommand(parsedPayload)) {
        await deactivateTextDialog(env, userId);
        await deactivateVoiceDialog(env, userId);
        await handleLexiMainMenu({ userId, groupId, token: env.VK_TOKEN });
        return okResponse();
      }

      if (isProfileButtonText(text)) {
        await handleProfileMenu({ userId, groupId, token: env.VK_TOKEN });
        return okResponse();
      }

      if (isSettingsInfoButtonText(text)) {
        await handleSettingsInfoMenu({ userId, groupId, token: env.VK_TOKEN });
        return okResponse();
      }

      if (isReturnMainMenuButtonText(text)) {
        await deactivateTextDialog(env, userId);
        await deactivateVoiceDialog(env, userId);
        await handleReturnMainMenu({ userId, groupId, token: env.VK_TOKEN });
        return okResponse();
      }

      if (text.toLowerCase() === 'меню') {
        await deactivateTextDialog(env, userId);
        await deactivateVoiceDialog(env, userId);
        await handleLexiMainMenu({ userId, groupId, token: env.VK_TOKEN });
        return okResponse();
      }

      if (text.toLowerCase() === 'очистить' || text.toLowerCase() === 'clear') {
        await clearKeyboard(userId, 'Клавиатура удалена', env.VK_TOKEN, groupId);
        return okResponse();
      }

      const isDialogActive = await isTextDialogActive(env, userId);
      if (isDialogActive && text) {
        await enqueueTextDialogMessage({
          env,
          userId,
          groupId,
          text,
        });
        return okResponse();
      }

      const audioAttachment = findAudioMessageAttachment(message.attachments);
      const isVoiceModeActive = await isVoiceDialogActive(env, userId);
      if (isVoiceModeActive && audioAttachment?.link_mp3) {
        await enqueueVoiceDialogMessage({
          env,
          userId,
          groupId,
          linkMp3: audioAttachment.link_mp3,
          duration: Number(audioAttachment.duration),
        });
        return okResponse();
      }

      if (isFirstVisit) {
        await sendFirstVisitMessage(userId, env.VK_TOKEN, groupId);
      } else {
        await handleExistingUser({ userId, groupId, token: env.VK_TOKEN });
      }
    }

    return okResponse();
  },

  async queue(batch, env, ctx) {
    await handleQueueBatch(batch, env, ctx);
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
  return (payload?.v === 1 && payload?.c === 'os') || normalizedText === 'начать' || normalizedText === 'начнем' || normalizedText === 'начнём';
}

function validateVkCallbackSecret(payload, env) {
  const configuredSecret = env.VK_CALLBACK_SECRET || env.VK_SECRET;

  if (!configuredSecret) {
    console.warn('[SECURITY] VK callback secret не настроен (VK_CALLBACK_SECRET или VK_SECRET)');
    return { ok: true, skipped: true };
  }

  const incomingSecret = typeof payload?.secret === 'string' ? payload.secret : '';
  if (incomingSecret !== configuredSecret) {
    console.error('[SECURITY] Отклонен callback: неверный секрет');
    return { ok: false };
  }

  return { ok: true };
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
    '👋Добро пожаловать!',
    '',
    'Чтобы обучение было действительно полезным, я сначала задам Вам несколько простых вопросов.',
    'Это поможет понять Ваш уровень, цель изучения английского и темы, которые Вы хотите прокачать в первую очередь.',
    '',
    'Ответьте на 3 коротких блока - и я подберу персональный старт обучения.❤️',
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

async function clearKeyboard(userId, text, token, groupId) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: text,
    keyboard: { buttons: [] },
  });
}

function findAudioMessageAttachment(attachments) {
  if (!Array.isArray(attachments)) {
    return null;
  }

  for (const attachment of attachments) {
    if (attachment?.type === 'audio_message' && attachment?.audio_message?.link_mp3) {
      return attachment.audio_message;
    }
  }

  return null;
}
