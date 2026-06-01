import { sendVkMessage } from '../../services/vkApi.js';
import { addDictionaryWordPayload } from './addWord.js';
import { dictionaryGamePayload } from './rememberWordGame.js';
import { myDictionaryWordsPayload } from './myWords.js';

const PAYLOAD_VERSION = 1;
const LEXI_DICTIONARY_COMMAND = 'lexi_dictionary';
const LEXI_DICTIONARY_PHOTO_ATTACHMENT = 'photo175946972_457239746_477ec1ed3331d5fbe2';

export function lexiDictionaryPayload() {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: LEXI_DICTIONARY_COMMAND,
  });
}

export function isLexiDictionaryCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === LEXI_DICTIONARY_COMMAND;
}

const lexiDictionaryKeyboard = {
  inline: true,
  buttons: [
    [
      {
        action: {
          type: 'callback',
          label: '➕ Добавить слово',
          payload: addDictionaryWordPayload(),
        },
        color: 'primary',
      },
    ],
    [
      {
        action: {
          type: 'callback',
          label: '📖 Мои слова',
          payload: myDictionaryWordsPayload(),
        },
        color: 'primary',
      },
    ],
    [
      {
        action: {
          type: 'callback',
          label: '🎮 Игра “Вспомни слово”',
          payload: dictionaryGamePayload(),
        },
        color: 'secondary',
      },
    ],
  ],
};

export async function handleLexiDictionary({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    attachment: LEXI_DICTIONARY_PHOTO_ATTACHMENT,
    message: [
      'Здесь живут Ваши личные английские слова 📚✨ те, которые Вы хотите запомнить, повторить и начать использовать в речи.',
      '',
      'Добавляйте новые слова, возвращайтесь к ним в любое время и тренируйте память через мини-игру 🎯🧠 Чем чаще Вы встречаете слово, тем быстрее оно становится “своим”.',
      '',
      'Сохраняйте, повторяйте и прокачивайте словарный запас каждый день 🚀🇬🇧',
    ].join('\n'),
    keyboard: lexiDictionaryKeyboard,
  });
}
