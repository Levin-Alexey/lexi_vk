import { PROFILE_BUTTON_TEXT, RETURN_MAIN_MENU_BUTTON_TEXT, SETTINGS_INFO_BUTTON_TEXT } from './constants.js';

export function buildPersistentMainMenuKeyboard() {
  return {
    one_time: false,
    buttons: [
      [
        {
          action: { type: 'text', label: PROFILE_BUTTON_TEXT },
          color: 'primary',
        },
        {
          action: { type: 'text', label: SETTINGS_INFO_BUTTON_TEXT },
          color: 'primary',
        },
      ],
      [
        {
          action: { type: 'text', label: RETURN_MAIN_MENU_BUTTON_TEXT },
          color: 'secondary',
        },
      ],
    ],
  };
}