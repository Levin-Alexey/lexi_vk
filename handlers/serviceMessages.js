import { sendVkMessage } from '../services/vkApi.js';

const PAYLOAD_VERSION = 1;
const SHOW_TARIFFS_COMMAND = 'show_tariffs';
const LEXI_MAIN_MENU_COMMAND = 'lexi_main_menu';

const tariffKeyboard = {
  inline: true,
  buttons: [
    [
      {
        action: {
          type: 'open_link',
          label: 'Тариф Beginner',
          link: 'https://vk.com/lexi_bot?w=donut_payment-230370533&levelId=2860',
        },
      },
    ],
    [
      {
        action: {
          type: 'open_link',
          label: 'Тариф Intermediate',
          link: 'https://vk.com/lexi_bot?w=donut_payment-230370533&levelId=2861',
        },
      },
    ],
    [
      {
        action: {
          type: 'open_link',
          label: 'Тариф Advanced',
          link: 'https://vk.com/lexi_bot?w=donut_payment-230370533&levelId=2862',
        },
      },
    ],
    [
      {
        action: {
          type: 'callback',
          label: 'Главное меню',
          payload: JSON.stringify({ v: PAYLOAD_VERSION, c: LEXI_MAIN_MENU_COMMAND }),
        },
        color: 'secondary',
      },
    ],
  ],
};

export function isShowTariffsCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === SHOW_TARIFFS_COMMAND;
}

export async function handleShowTariffs({ userId, groupId, token }) {
  const message = `Бесплатные лимиты на сегодня закончились.

Но это не повод останавливаться - подключите тариф и продолжайте заниматься с Lexi без пауз, с большим количеством уроков, диалогов и практики каждый день.

💬 Наши тарифы

Lexi помогает заниматься английским каждый день: проходить уроки, тренировать диалоги, отправлять текстовые и голосовые сообщения, переводить фразы и сохранять новые слова.

🔹 Бесплатный тариф Free

Подходит, чтобы познакомиться с Lexi и попробовать обучение.

Доступно:
• 9 первых уроков
• Текстовые сообщения: 5 в день
• Голосовые сообщения: 3 в день

🔸 Платные тарифы VK Donut

Подписка открывает больше возможностей для регулярных занятий.

Для всех платных тарифов доступно:
• 150 уроков по всем уровням
• Личный словарь для новых слов и фраз
• Профессиональный переводчик
• Перевод с русского на английский
• Перевод с английского на русский
• Расширенные лимиты на общение с Lexi

Beginner
• Текстовые сообщения: 50 в день
• Голосовые сообщения: 20 в день

Intermediate
• Текстовые сообщения: 100 в день
• Голосовые сообщения: 30 в день

Advanced
• Текстовые сообщения: 150 в день
• Голосовые сообщения: 50 в день

Выберите подходящий уровень подписки и занимайтесь английским с Lexi в удобном темпе 🚀`;

  return sendVkMessage({
    userId,
    groupId,
    token,
    message,
    keyboard: tariffKeyboard,
  });
}
