import { sendVkMessage } from '../../services/vkApi.js';

const PAYLOAD_VERSION = 1;
const LEXI_DICTIONARY_COMMAND = 'lexi_dictionary';

export function lexiDictionaryPayload() {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: LEXI_DICTIONARY_COMMAND,
  });
}

export function isLexiDictionaryCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === LEXI_DICTIONARY_COMMAND;
}

export async function handleLexiDictionary({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: 'Тут будет словарь',
  });
}
