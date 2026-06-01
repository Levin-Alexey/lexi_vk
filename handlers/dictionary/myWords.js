import { sendVkMessage } from '../../services/vkApi.js';

const PAYLOAD_VERSION = 1;
const MY_DICTIONARY_WORDS_COMMAND = 'dictionary_my_words';

export function myDictionaryWordsPayload() {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: MY_DICTIONARY_WORDS_COMMAND,
  });
}

export function isMyDictionaryWordsCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === MY_DICTIONARY_WORDS_COMMAND;
}

export async function handleMyDictionaryWords({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: 'Раздел с Вашими словами скоро появится. Здесь будет список сохраненных слов для повторения 📖',
  });
}