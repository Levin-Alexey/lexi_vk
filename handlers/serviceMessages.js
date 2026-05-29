import { sendVkMessage } from '../services/vkApi.js';

const PAYLOAD_VERSION = 1;
const SHOW_TARIFFS_COMMAND = 'show_tariffs';

const tariffKeyboard = {
  inline: true,
  buttons: [
    [
      {
        action: {
          type: 'open_link',
          label: 'Уровень A1',
          link: 'https://vk.com/lexi_bot?w=donut_payment-230370533&levelId=2860',
        },
      },
    ],
    [
      {
        action: {
          type: 'open_link',
          label: 'Уровень B1',
          link: 'https://vk.com/lexi_bot?w=donut_payment-230370533&levelId=2861',
        },
      },
    ],
    [
      {
        action: {
          type: 'open_link',
          label: 'Уровень C1',
          link: 'https://vk.com/lexi_bot?w=donut_payment-230370533&levelId=2862',
        },
      },
    ],
  ],
};

export function isShowTariffsCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === SHOW_TARIFFS_COMMAND;
}

export async function handleShowTariffs({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: 'Тут будет описание тарифов',
    keyboard: tariffKeyboard,
  });
}
