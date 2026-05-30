import { sendVkMessage } from '../../services/vkApi.js';
import { lexiVoiceDialogPayload } from './lexiVoiceDialog.js';

const PAYLOAD_VERSION = 1;
const LEXI_VOICE_COMMAND = 'lexi_voice';
const LEXI_VOICE_PHOTO_ATTACHMENT = 'photo175946972_457239745_35ece1b6bff70851bd';

export function lexiVoicePayload() {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: LEXI_VOICE_COMMAND,
  });
}

export function isLexiVoiceCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === LEXI_VOICE_COMMAND;
}

const lexiVoiceKeyboard = {
  inline: true,
  buttons: [
    [
      {
        action: {
          type: 'callback',
          label: 'Начать диалог',
          payload: lexiVoiceDialogPayload(),
        },
        color: 'primary',
      },
    ],
  ],
};

export async function handleLexiVoice({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    attachment: LEXI_VOICE_PHOTO_ATTACHMENT,
    message: [
      'Голосовой режим активирован!🎙️',
      '',
      'Отправьте голосовое сообщение - и я разберу его, помогу с произношением и отвечу на английском.',
      '',
      '🎙 Буду рада поговорить с Вами 😻',
      '',
      'Здесь Вы можете общаться со мной голосом - просто нажми на микрофон и скажи фразу на английском или русском.',
      'Я распознаю твоё сообщение, помогу ответить, поправлю ошибки и поддержу диалог, как настоящий собеседник.',
      '',
      'Не переживай за произношение  мы здесь как раз для того, чтобы тренироваться спокойно и с удовольствием 😊',
    ].join('\n'),
    keyboard: lexiVoiceKeyboard,
  });
}
