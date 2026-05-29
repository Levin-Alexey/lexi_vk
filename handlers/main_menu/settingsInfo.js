import { sendVkMessage } from '../../services/vkApi.js';
import { SETTINGS_INFO_BUTTON_TEXT } from './constants.js';
import { buildPersistentMainMenuKeyboard } from './persistentKeyboard.js';

export function isSettingsInfoButtonText(text) {
  return String(text || '').trim() === SETTINGS_INFO_BUTTON_TEXT;
}

export async function handleSettingsInfoMenu({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: 'Раздел настроек и информации скоро появится. Пока это заглушка.',
    keyboard: buildPersistentMainMenuKeyboard(),
  });
}