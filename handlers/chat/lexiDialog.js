import { sendVkMessage } from '../../services/vkApi.js';
import { buildPersistentMainMenuKeyboard } from '../main_menu/persistentKeyboard.js';
import { activateTextDialog } from '../../services/textDialog.js';
import { deactivateVoiceDialog } from '../../services/voiceDialog.js';

const PAYLOAD_VERSION = 1;
const LEXI_DIALOG_COMMAND = 'lexi_dialog';

export function lexiDialogPayload() {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: LEXI_DIALOG_COMMAND,
  });
}

export function isLexiDialogCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === LEXI_DIALOG_COMMAND;
}

export async function handleLexiDialog({ userId, groupId, token, env }) {
  await deactivateVoiceDialog(env, userId);
  await activateTextDialog(env, userId);

  return sendVkMessage({
    userId,
    groupId,
    token,
    message: [
      'Начинаем диалог. 🚀',
      '',
      'Теперь просто отправь любое сообщение, и я отвечу на английском.',
      'Если понадобится, ты сможешь раскрыть перевод кнопкой под ответом.',
    ].join('\n'),
    keyboard: buildPersistentMainMenuKeyboard(),
  });
}
