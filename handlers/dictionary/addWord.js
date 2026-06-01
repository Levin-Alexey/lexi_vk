import { sendVkMessage } from '../../services/vkApi.js';
import { handleAddWordCommand } from '../../services/dictionaryService.js';

const PAYLOAD_VERSION = 1;
const ADD_DICTIONARY_WORD_COMMAND = 'dictionary_add_word';
const ADD_DICTIONARY_WORD_ACTION_COMMAND = 'dictionary_add_word_action';

export function addDictionaryWordPayload() {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: ADD_DICTIONARY_WORD_COMMAND,
  });
}

export function isAddDictionaryWordCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === ADD_DICTIONARY_WORD_COMMAND;
}

export function addDictionaryWordActionPayload() {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: ADD_DICTIONARY_WORD_ACTION_COMMAND,
  });
}

export function isAddDictionaryWordActionCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === ADD_DICTIONARY_WORD_ACTION_COMMAND;
}

const addDictionaryWordKeyboard = {
  inline: true,
  buttons: [
    [
      {
        action: {
          type: 'callback',
          label: 'Добавить слово',
          payload: addDictionaryWordActionPayload(),
        },
        color: 'primary',
      },
    ],
  ],
};

export async function handleAddDictionaryWord({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: [
      'Добавить новое слово 📚✨',
      '',
      'Нажмите кнопку "Добавить слово" - и Lexi добавит в Ваш личный словарь новое английское слово из общей базы.',
      '',
      'Слова появляются не случайно: сначала добавляются самые частотные и полезные слова английского языка по датасету Oxford. То есть Вы постепенно собираете словарь из тех слов, которые действительно чаще всего встречаются в речи, текстах и повседневном общении.',
      '',
      'Добавляйте слова, повторяйте их и постепенно расширяйте свой английский запас без лишней зубрежки.',
      '',
      'Готовы добавить новое слово в словарь?',
    ].join('\n'),
    keyboard: addDictionaryWordKeyboard,
  });
}

export async function handleAddDictionaryWordAction({ env, userId, groupId, token }) {
  return handleAddWordCommand(env, userId, groupId, token);
}