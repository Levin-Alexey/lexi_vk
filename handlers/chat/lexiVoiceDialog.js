import { sendVkMessage } from '../../services/vkApi.js';
import { buildPersistentMainMenuKeyboard } from '../main_menu/persistentKeyboard.js';
import { activateVoiceDialog } from '../../services/voiceDialog.js';
import { deactivateTextDialog } from '../../services/textDialog.js';

const PAYLOAD_VERSION = 1;
const LEXI_VOICE_DIALOG_COMMAND = 'lexi_voice_dialog';

export function lexiVoiceDialogPayload() {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: LEXI_VOICE_DIALOG_COMMAND,
  });
}

export function isLexiVoiceDialogCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === LEXI_VOICE_DIALOG_COMMAND;
}

export async function handleLexiVoiceDialog({ userId, groupId, token, env }) {
  await deactivateTextDialog(env, userId);
  await activateVoiceDialog(env, userId);

  return sendVkMessage({
    userId,
    groupId,
    token,
    message: [
      'Начинаем диалог. ! 🚀',
      '',
      'Теперь просто отправь голосовое сообщение, и я отвечу на английском.',
      'Если понадобится, Вы сможете раскрыть перевод кнопкой под ответом или оригинал моей фразы.',
    ].join('\n'),
    keyboard: buildPersistentMainMenuKeyboard(),
  });
}
