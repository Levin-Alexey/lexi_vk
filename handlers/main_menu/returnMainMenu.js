import { handleLexiMainMenu } from '../lexiChat.js';
import { RETURN_MAIN_MENU_BUTTON_TEXT } from './constants.js';

export function isReturnMainMenuButtonText(text) {
  return String(text || '').trim() === RETURN_MAIN_MENU_BUTTON_TEXT;
}

export async function handleReturnMainMenu({ userId, groupId, token }) {
  return handleLexiMainMenu({ userId, groupId, token });
}