export const A2_LESSON_26 = {
  id: 56,
  level_id: 2,
  order_num: 26,
  title: "Модальные глаголы: can, could, should, must",
  description: "Освойте главные регуляторы ответственности и возможностей в ИТ. Научитесь ставить жесткие рамки, давать экспертные советы и вежливо запрашивать доступы.",
  is_premium: 0,
  steps: [
    {
      order_num: 1,
      step_type: "theory",
      content: {
        text: `🎬 ПРАВИЛА ИГРЫ С LEXI: АРХИТЕКТУРА МОДАЛЬНОСТИ

Привет! На связи Lexi. Мы продолжаем собирать твой продвинутый ИТ-инструментарий уровня А2. Сегодня мы заходим на территорию модальных глаголов (Modal Verbs). Это особые слова-регуляторы, которые не показывают само действие, а выражают наше отношение к нему: физическую возможность, вежливую просьбу, профессиональный совет или жесткое системное требование.

В управлении проектами и автоматизации эти слова - фундамент ТЗ и документации. Как сказать джуниору, что он ОБЯЗАН использовать ключи шифрования? Как вежливо попросить клиента прислать токены от Wildberries или Ozon? Как дать совет партнеру оптимизировать промпт?

Включайте видео! Мы разберем топ-4 главных модальных глагола, выучим два железных правила их синтаксиса и внедрим их в вашу ежедневную практику без багов.`,
        video_url: "https://vk.com/video-230370533_456239082",
        vk_attachment: "video-230370533_456239082",
        button_text: "К правилам модальности ➡️"
      }
    },
    {
      order_num: 2,
      step_type: "theory",
      content: {
        text: `✨ УРОК 26. ДВА ЖЕЛЕЗНЫХ ЗАКОНА И МАТРИЦА СМЫСЛОВ

Запомни два главных правила для глаголов can, could, should, must. Они одинаковы для всех лиц (никаких окончаний -s) и после них КАТЕГОРИЧЕСКИ НЕЛЬЗЯ ставить частицу TO! Только чистый глагол действия.
• Ошибка: I must to check. / He cans process.
• Правильно: I must check. / He can process.

ДАВАЙ РАЗБЕРЕМ НАШУ ЧЕТВЕРКУ ПОД МИКРОСКОПОМ:

1. CAN [кэн] — Физическая или техническая возможность
Используй его, когда система или человек способны выполнить задачу прямо сейчас.
• Пример: This AI agent can parse VK group keywords automatically. (Этот ИИ-агент может парсить ключевые слова групп ВК автоматически).

2. COULD [куд] — Супер-вежливая просьба
Идеальный бизнес-маркер для созвонов и чатов. Переводится как «не могли бы вы...».
• Пример: Could you send the new database access tokens, please? (Не могли бы вы прислать новые токены доступа к базе данных, пожалуйста?).

3. SHOULD [шуд] — Экспертный совет или рекомендация
Когда ты не приказываешь, а мягко подсказываешь лучшее инженерное решение.
• Пример: We should optimize this script because it uses too much server power. (Нам следует оптимизировать этот скрипт, потому что он потребляет слишком много мощностей сервера).

4. MUST [маст] — Жесткое требование / Обязанность / Закон
Когда нарушение правила приведет к падению прод-сервера или блокировке API.
• Пример: You must hide your Looker Studio passwords in raw strings. (Вы обязаны прятать свои пароли Looker Studio в необработанных строках).`,
        button_text: "Понятно, дальше ➡️"
      }
    },
    {
      order_num: 3,
      step_type: "theory",
      content: {
        text: `📖 ЖИВОЙ МИКРО-ДИАЛОГ: НАСТРОЙКА БЕЗОПАСНОСТИ ДЛЯ МАРКЕТПЛЕЙСОВ

Давай послушаем, как основатель ИТ-студии Алекс и менеджер Марина обсуждают критические правила интеграции многоагентной системы для автоматизации личных кабинетов Ozon и Wildberries:

Marina: Alex, the development team is ready to test the new Telegram and VK userbot-parser. Can we start the script now?
Alex: Wait, Marina. Before the launch, we must check the security parameters. We must protect our client data.
Marina: Understood. Could you look at the raw connection strings right now? 
Alex: Yes, I can. Well, I see a small problem. We shouldn't keep open API keys in this text block. It is dangerous.
Marina: Oh, you are right. What should we do about it?
Alex: The developers should move all passwords to the private cloud infrastructure. Our script can pull them from there safely.
Marina: Excellent advice, Alex! I'll tell the team. We must not launch the bot with open keys.

🇷🇺 ПЕРЕВОД ДЛЯ ПРОВЕРКИ:

Марина: Алекс, команда разработки готова протестировать новый юзербот-парсер для Telegram и ВК. Мы можем запустить скрипт сейчас? (Can we start...? — техническая возможность).
Алекс: Подожди, Марина. Перед запуском мы обязаны проверить параметры безопасности. Мы должны защитить данные наших клиентов. (we must check, we must protect — жесткое требование).
Марина: Понятно. Не мог бы ты взглянуть на необработанные строки подключения прямо сейчас? (Could you look...? — вежливая просьба).
Алекс: Да, я могу. (Yes, I can). Ну, я вижу небольшую проблему. Нам не следует хранить открытые API-ключи в этом текстовом блоке. Это опасно. (We shouldn't keep... — рекомендация/совет).
Марина: О, ты прав. Что нам следует с этим сделать? (What should we do...?)
Алекс: Разработчикам следует перенести все пароли в приватную облачную инфраструктуру. Наш скрипт может безопасно забирать их оттуда. (developers should move, script can pull).
Марина: Отличный совет, Алекс! Я передам команде. Мы не должны запускать бота с открытыми ключами.

💡 А2 ПРО-ЛАЙФХАК ДЛЯ ОТРИЦАНИЙ:
Обрати внимание на разницу отрицаний:
• Shouldn't — совет так не делать (Не стоит так делать, но мир не рухнет).
• Must not (mustn't) — строжайший запрет (Категорически нельзя, иначе всё сломается!).

🔥 Твое мини-задание: Представь, что просишь у зарубежного коллеги доступы к Гитхабу. Произнеси вслух вежливо и бегло: "Could you send the access keys, please?". Почувствуй силу модального глагола!`,
        button_text: "Перейти к тестам ➡️"
      }
    },
    {
      order_num: 4,
      step_type: "quiz_choice",
      content: {
        question: "Вам нужно написать зарубежному заказчику в чате и вежливо попросить его: «Не могли бы вы обновить данные вашей компании в инвойсе?». Какой глагол идеален для вежливой бизнес-просьбы?",
        options: [
          { id: "a", text: "Must you update your company details in the invoice?", is_correct: false },
          { id: "b", text: "Could you update your company details in the invoice?", is_correct: true },
          { id: "c", text: "Could you to update your company details in the invoice?", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ — вариант B. Глагол «Could» является эталоном вежливой просьбы в английском деловом этикете. Вариант C ошибочен, так как после модальных глаголов частица «to» никогда не ставится."
      }
    },
    {
      order_num: 5,
      step_type: "quiz_choice",
      content: {
        question: "Вы пишете техническую инструкцию для младшего разработчика онлайн-школы: «Ты обязан сохранять все изменения кода в репозиторий перед деплоем». Как выразить строгое системное требование?",
        options: [
          { id: "a", text: "You must save all code changes to the repository.", is_correct: true },
          { id: "b", text: "You must to save all code changes to the repository.", is_correct: false },
          { id: "c", text: "You should to save all code changes to the repository.", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ — «You must save all code changes to the repository.». Для выражения строгой обязанности и жесткого правила используется глагол «must», после которого идет чистый глагол без частицы «to»."
      }
    },
    {
      order_num: 6,
      step_type: "quiz_choice",
      content: {
        question: "Марина прислала в рабочий Slack рекомендацию по оптимизации: «We should review our Wildberries analytics prompt structures because they are too complex». Что советует сделать Марина?",
        options: [
          { id: "a", text: "Команда категорически обязана немедленно удалить всю аналитику Wildberries.", is_correct: false },
          { id: "b", text: "Нам следует разобрать и пересмотреть структуры промптов аналитики Wildberries, так как они слишком сложные.", is_correct: true },
          { id: "c", text: "Команда технически не может запустить структуры промптов для маркетплейса.", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ — «Нам следует разобрать и пересмотреть структуры промптов аналитики Wildberries, так как они слишком сложные.». Модальный глагол «should» переводится как «следует / стоит» и выражает экспертную рекомендацию или совет."
      }
    }
  ]
};