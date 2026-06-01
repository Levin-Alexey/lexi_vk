import { sendVkMessage } from '../../services/vkApi.js';

const PAYLOAD_VERSION = 1;
const DICTIONARY_GAME_COMMAND = 'dictionary_game';

export function dictionaryGamePayload() {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: DICTIONARY_GAME_COMMAND,
  });
}

export function isDictionaryGameCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === DICTIONARY_GAME_COMMAND;
}

export async function handleDictionaryGame({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: 'Мини-игру “Вспомни слово” скоро подключим. Здесь будет тренировка памяти по сохраненным словам 🎮',
  });
}