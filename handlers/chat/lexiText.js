import { sendVkMessage } from '../../services/vkApi.js';
import { lexiDialogPayload } from './lexiDialog.js';

const PAYLOAD_VERSION = 1;
const LEXI_TEXT_COMMAND = 'lexi_text';
const LEXI_TEXT_PHOTO_ATTACHMENT = 'photo175946972_457239743_460e7bd59d3d978db0';

export function lexiTextPayload() {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: LEXI_TEXT_COMMAND,
  });
}

export function isLexiTextCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === LEXI_TEXT_COMMAND;
}

const lexiTextKeyboard = {
  inline: true,
  buttons: [
    [
      {
        action: {
          type: 'callback',
          label: 'Начать диалог 💬',
          payload: lexiDialogPayload(),
        },
        color: 'primary',
      },
    ],
  ],
};

export async function handleLexiText({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    attachment: LEXI_TEXT_PHOTO_ATTACHMENT,
    message: [
      'Я на связи 😊',
      'Напишите мне сообщение - на русском, английском или вперемешку. Я помогу перевести, исправить, объяснить и потренировать нужные фразы.',
      '',
      'Можем просто поболтать или устроить мини-диалог на английском.',
      '',
      'Жду твоё первое сообщение!',
    ].join('\n'),
    keyboard: lexiTextKeyboard,
  });
}
