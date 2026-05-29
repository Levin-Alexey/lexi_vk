import { sendVkMessage } from '../../services/vkApi.js';
import { PROFILE_BUTTON_TEXT } from './constants.js';
import { buildPersistentMainMenuKeyboard } from './persistentKeyboard.js';

export function isProfileButtonText(text) {
  return String(text || '').trim() === PROFILE_BUTTON_TEXT;
}

export async function handleProfileMenu({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: 'Личный кабинет скоро появится. Пока это заглушка.',
    keyboard: buildPersistentMainMenuKeyboard(),
  });
}