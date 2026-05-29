import { sendVkMessage } from '../services/vkApi.js';
import { buildPersistentMainMenuKeyboard } from './main_menu/persistentKeyboard.js';

const REWARD_MESSAGES = {
  text_msg: 'Вы получили награду за активную текстовую практику.',
  voice_msg: 'Вы получили награду за активную голосовую практику.',
};

export async function sendLcoinRewardMessage({ userId, groupId, token, metricKey, earned, totalCount, threshold }) {
  if (!earned || earned <= 0) {
    return { ok: true, skipped: true };
  }

  const rewardText = REWARD_MESSAGES[metricKey] || 'Вы получили награду за активность в Lexi.';
  const message = [
    'Начислены LCoin! ✨',
    '',
    `+${earned} LCoin`,
    rewardText,
    `Прогресс: ${totalCount} из ${threshold}.`,
  ].join('\n');

  return sendVkMessage({
    userId,
    groupId,
    token,
    message,
    keyboard: buildPersistentMainMenuKeyboard(),
  });
}
