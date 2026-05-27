import { sendVkMessage } from '../../services/vkApi.js';

const PAYLOAD_VERSION = 1;
const LEXI_VOICE_COMMAND = 'lexi_voice';

export function lexiVoicePayload() {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: LEXI_VOICE_COMMAND,
  });
}

export function isLexiVoiceCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === LEXI_VOICE_COMMAND;
}

export async function handleLexiVoice({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: [
      'Голосовой режим активирован 🎙️',
      '',
      'Отправьте голосовое сообщение - и я разберу его, помогу с произношением и отвечу на английском.',
    ].join('\n'),
  });
}
