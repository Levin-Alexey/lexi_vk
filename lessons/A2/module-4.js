export const A2_LESSON_4 = {
  id: 34,
  level_id: 2,
  order_num: 4,
  title: "Вопросы и короткие ответы",
  description: "Доведите до автоматизма реакцию на любые вопросы собеседника, используя продвинутое эхо-правило для идеальных коротких ответов.",
  is_premium: 0,
  steps: [
    {
      order_num: 1,
      step_type: "theory",
      content: {
        text: `🎬 СИНХРОНИЗАЦИЯ РЕАКЦИИ С LEXI

Привет! На связи Lexi. На уровне А2 Ваша главная цель - избавиться от долгих пауз в разговоре, когда вы судорожно перебираете правила в голове перед тем, как ответить. 

Сегодня мы выведем на новый уровень навык, который мгновенно делает вашу речь беглой и профессиональной — короткие ответы. На созвонах с клиентами, обсуждениях спринтов или при общении с командой вам постоянно задают вопросы. Если отвечать на них просто одиночным Yes или No, вы кажетесь холодным или неразговорчивым. 

Включайте новое видео! Мы разберем, как натренировать ваш речевой процессор зеркально отражать глагол собеседника и выдавать идеальный, вежливый ответ за доли секунды.`,
        video_url: "https://vk.com/video-230370533_456239060",
        vk_attachment: "video-230370533_456239060", 
        button_text: "К продвинутой теории ➡️"
      }
    },
    {
      order_num: 2,
      step_type: "theory",
      content: {
        text: `✨ УРОК 34. ПРОДВИНУТОЕ ЭХО-ПРАВИЛО ОТВЕТОВ

Суть эхо-правила проста: первое слово вопроса содержит в себе ключ к идеальному ответу. Твоя задача — поймать этот первый глагол и вернуть его собеседнику, правильно подобрав местоимение.

Давай разберем три главные группы вопросов, которые управляют ИТ-коммуникацией:

1. ГРУППА ДЕЙСТВИЯ (Do / Does)
Если вопрос начинается с помощников Present Simple, мы возвращаем именно их. На уровне А2 важно правильно менять местоимение, если спрашивают про группу людей или компанию.
• Does your multi-agent system analytics work fast? (Твоя система аналитики работает быстро?)
• Yes, it does! / No, it doesn't. (Система — это она/оно, то есть It).

2. ГРУППА СОСТОЯНИЯ И ГОТОВНОСТИ (Am / Is / Are)
Лови форму глагола to be в начале и адаптируй под свой ответ.
• Are the new API integration modules secure? (Новые модули интеграции API защищены?)
• Yes, they are. / No, they aren't. (Модули — это они, They).

3. ГРУППА ВОЗМОЖНОСТЕЙ И НАВЫКОВ (Can)
Самая приятная группа, потому что глагол can универсален и никогда не меняет форму.
• Can your team launch the VK mini-app this week? (Твоя команда может запустить мини-приложение ВК на этой неделе?)
• Yes, they can. / No, they can't.

ПРАВИЛО БЕЗОПАСНОСТИ: В коротких ответах никогда не используй полные имена или названия компаний. Заменяй их на чистые местоимения (he, she, it, they)!`,
        button_text: "Понятно, дальше ➡️"
      }
    },
    {
      order_num: 3,
      step_type: "theory",
      content: {
        text: `📖 ЖИВОЙ МИКРО-ДИАЛОГ: ПЕРЕГОВОРЫ С ЗАКАЗЧИКОМ

Давай послушаем, как основатель ИТ-агентства Алекс обсуждает детали автоматизации маркетплейсов с зарубежным клиентом Томом на финальном созвоне:

Tom: Alex, hello! Can we test the new analytics dashboard for Wildberries today?
Alex: Hi Tom! Yes, we can. The staging environment is active.
Tom: Excellent. Do the automated bots update data every hour?
Alex: Yes, they do. They collect metrics automatically.
Tom: Perfect. Is the database connection stable now?
Alex: Yes, it is. We have no latency issues.
Tom: Great! Does your partner Marina manage the deployment phase?
Alex: Yes, she does. She controls the whole team.

🇷🇺 ПЕРЕВОД ДЛЯ ПРОВЕРКИ:

Том: Алекс, привет! Мы можем протестировать новую панель аналитики для Wildberries сегодня?
Алекс: Привет, Том! Да, можем. Тестовая среда активна. (Can we test? — Yes, we can).
Том: Отлично. Автоматизированные боты обновляют данные каждый час?
Алекс: Да. Они собирают метрики автоматически. (Do the bots update? — Yes, they do).
Том: Прекрасно. Подключение к базе данных сейчас стабильно?
Алекс: Да, стабильно. У нас нет проблем с задержкой. (Is the connection stable? — Yes, it is).
Том: Супер! Твой партнер Марина руководит этапом деплоя?
Алекс: Да. Она контролирует всю команду. (Does Marina manage? — Yes, she does).

💡 А2 ПРО-ЛАЙФХАК: ОСТОРОЖНО С КОЛЛЕКТИВНЫМ «ВЫ»
Когда клиент спрашивает лично тебя: Are you ready?, он может иметь в виду как тебя одного (Да, я готов — Yes, I am), так и всю твою команду (Да, мы готовы — Yes, we are). Всегда оценивай контекст встречи, чтобы выбрать верный хвостик ответа!

🔥 Твое мини-задание: Представь, что крупный заказчик спрашивает тебя на созвоне: Can you finish the project on time?. Ответь ему вслух твердо, вежливо и по-носительски: Yes, I can! Почувствуй эту уверенность.`,
        button_text: "Перейти к тестам ➡️"
      }
    },
    {
      order_num: 4,
      step_type: "quiz_choice",
      content: {
        question: "Заказчик на созвоне спрашивает тебя про новую нейросеть: «Does this AI model generate code without errors?». Как вежливо и грамотно ответить «Нет», если модель еще требует доработки?",
        options: [
          { id: "a", text: "No, it don't.", is_correct: false },
          { id: "b", text: "No, it doesn't.", is_correct: true },
          { id: "c", text: "No, this AI model doesn't.", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ - «No, it doesn't.». Вопрос начинается с Does, предмет (AI model) заменяется на местоимение «it». В коротком ответе нельзя заново повторять слова «this AI model» (вариант C), нужно использовать строго местоимение."
      }
    },
    {
      order_num: 5,
      step_type: "quiz_choice",
      content: {
        question: "Коллега интересуется статусом интеграции скриптов: «Are the automation workflows ready for the clients?». Выбери абсолютно точный короткий ответ для подтверждения готовности:",
        options: [
          { id: "a", text: "Yes, they do.", is_correct: false },
          { id: "b", text: "Yes, they are.", is_correct: true },
          { id: "c", text: "Yes, it is.", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ - «Yes, they are.». Вопрос начинается с глагола to be в форме Are, а подлежащее (automation workflows) стоит во множественном числе, то есть заменяется на «they». По эхо-правилу возвращаем «they are»."
      }
    },
    {
      order_num: 6,
      step_type: "quiz_choice",
      content: {
        question: "Иностранный инвестор спрашивает тебя на презентации школы: «Can your platform handle one thousand users simultaneously?». Какой ответ будет грамматически безупречным?",
        options: [
          { id: "a", text: "Yes, it can.", is_correct: true },
          { id: "b", text: "Yes, it does.", is_correct: false },
          { id: "c", text: "Yes, they can.", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ - «Yes, it can.». Вопрос задан с модальным глаголом Can, значит его же мы и возвращаем в конце ответа. Платформа (platform) — это единственное число, неодушевленный предмет, поэтому берем местоимение «it», а не «they»."
      }
    }
  ]
};