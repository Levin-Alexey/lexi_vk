import { sendVkMessage } from '../../services/vkApi.js';
import { buildPersistentMainMenuKeyboard } from './persistentKeyboard.js';

const ONBOARDING_COMPLETED_PHOTO_ATTACHMENT = 'photo175946972_457239739_27eedd46884c68f160';

export async function handleOnboardingCompleted({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    attachment: ONBOARDING_COMPLETED_PHOTO_ATTACHMENT,
    message: [
      'Настройка завершена ✅',
      '',
      'Теперь нижнее меню всегда доступно для быстрого перехода в личный кабинет, настройки и возврат в главное меню.',
      'Если захочешь снова начать общение, нажми кнопку общения в основном экране Lexi.',
    ].join('\n'),
    keyboard: buildPersistentMainMenuKeyboard(),
  });
}