import { sendVkMessage } from '../services/vkApi.js';
import { lexiChatPayload } from './lexiChat.js';
import { lexiDictionaryPayload } from './dictionary/myDictionary.js';
import { lexiLessonsPayload } from './lessons/lexiLessons.js';

const RETURNING_USER_PHOTO_ATTACHMENT = 'photo175946972_457239739_27eedd46884c68f160';

const returningUserKeyboard = {
  inline: true,
  buttons: [
    [
      {
        action: {
          type: 'callback',
          label: 'Общение с Lexi',
          payload: lexiChatPayload(),
        },
        color: 'primary',
      },
    ],
    [
      {
        action: {
          type: 'callback',
          label: 'Мой словарь',
          payload: lexiDictionaryPayload(),
        },
        color: 'primary',
      },
    ],
    [
      {
        action: {
          type: 'callback',
          label: 'Английский по шагам',
          payload: lexiLessonsPayload(),
        },
        color: 'primary',
      },
    ],
  ],
};

export async function handleExistingUser({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    attachment: RETURNING_USER_PHOTO_ATTACHMENT,
    message: [
      'Рада видеть Вас снова! 😍',
      'Я уже подготовила для Вас несколько способов потренировать английский - выбирайте любой путь, а я подстроюсь под Ваш темп и настроение.',
      '',
      'Сегодня точно сделаем Ваш английский чуть увереннее. 🍀🤩🎉',
    ].join('\n'),
    keyboard: returningUserKeyboard,
  });
}
