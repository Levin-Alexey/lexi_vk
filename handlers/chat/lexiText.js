import { sendVkMessage } from '../../services/vkApi.js';

const PAYLOAD_VERSION = 1;
const LEXI_TEXT_COMMAND = 'lexi_text';

export function lexiTextPayload() {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: LEXI_TEXT_COMMAND,
  });
}

export function isLexiTextCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === LEXI_TEXT_COMMAND;
}

export async function handleLexiText({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: [
      'Текстовый режим активирован ✍️',
      '',
      'Напишите мне что угодно на английском или русском - и мы начнем разговор. Я помогу подобрать слова и исправлю ошибки мягко и без осуждения. 😊',
    ].join('\n'),
  });
}
