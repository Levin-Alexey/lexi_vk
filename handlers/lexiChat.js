import { sendVkMessage } from '../services/vkApi.js';
import { lexiVoicePayload } from './chat/lexiVoice.js';
import { lexiTextPayload } from './chat/lexiText.js';
import { handleExistingUser } from './existingUser.js';

const PAYLOAD_VERSION = 1;
const LEXI_CHAT_COMMAND = 'lexi_chat';
const LEXI_MAIN_MENU_COMMAND = 'lexi_main_menu';
const LEXI_CHAT_PHOTO_ATTACHMENT = 'photo175946972_457239742_30f9f510a78bc08515';

export function lexiChatPayload() {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: LEXI_CHAT_COMMAND,
  });
}

export function isLexiChatCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === LEXI_CHAT_COMMAND;
}

export function isLexiMainMenuCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === LEXI_MAIN_MENU_COMMAND;
}

const lexiChatKeyboard = {
  inline: true,
  buttons: [
    [
      {
        action: {
          type: 'callback',
          label: 'Общаться голосом 🗣️',
          payload: lexiVoicePayload(),
        },
        color: 'primary',
      },
    ],
    [
      {
        action: {
          type: 'callback',
          label: 'Общаться текстом ✍️',
          payload: lexiTextPayload(),
        },
        color: 'primary',
      },
    ],
    [
      {
        action: {
          type: 'callback',
          label: 'Главное меню 🏠',
          payload: JSON.stringify({ v: PAYLOAD_VERSION, c: LEXI_MAIN_MENU_COMMAND }),
        },
        color: 'secondary',
      },
    ],
  ],
};

export async function handleLexiChat({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    attachment: LEXI_CHAT_PHOTO_ATTACHMENT,
    message: [
      'Буду рада пообщаться с Вами 🤗💖',
      'Я могу общаться текстом или голосом - выбирайте, как Вам сейчас комфортнее.',
      '',
      'Напишите мне или скажите вслух - а я помогу потренировать английский легко, спокойно и без страха ошибиться. 🌟😊',
    ].join('\n'),
    keyboard: lexiChatKeyboard,
  });
}

export async function handleLexiMainMenu({ userId, groupId, token }) {
  return handleExistingUser({ userId, groupId, token });
}
