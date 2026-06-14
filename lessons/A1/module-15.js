export const A1_LESSON_15 = {
  id: 15,
  level_id: 1,
  order_num: 15,
  title: "Мой день",
  description: "Научитесь связывать распорядок дня и частотные слова в один связный, интересный рассказ о своей повседневной жизни.",
  is_premium: 0,
  steps: [
    {
      order_num: 1,
      step_type: "theory",
      content: {
        text: `🎬 ВИДЕО-ПРАКТИКА С LEXI: СВЯЗНЫЙ РАССКАЗ О СЕБЕ

Привет! Вы выучили глаголы рутины и частотные слова. Сегодня финальный аккорд этой большой темы - мы объединим все кусочки мозаики в один плавный, красивый рассказ о своем дне.

Вы научитесь уверенно отвечать на один из самых популярных вопросов при знакомстве: What do you do every day? (Что ты делаешь каждый день?).

Посмотрите короткое видео от Lexi! Она покажет, как правильно использовать слова-связки, чтобы ваш рассказ не звучал как сухой список дел, а лился как естественная, живая речь настоящего носителя.`,
        video_url: "https://vk.com/video-230370533_456239039",
        vk_attachment: "video-230370533_456239039", 
        button_text: "К теории ➡️"
      }
    },
    {
      order_num: 2,
      step_type: "theory",
      content: {
        text: `✨ УРОК 15. КОНСТРУКТОР РАССКАЗА «МОЙ ДЕНЬ»

Когда иностранец спрашивает: "What do you do every day?", он хочет услышать небольшую историю о твоей жизни. Чтобы рассказ звучал красиво, нам понадобятся слова-переходы (connectors). Они связывают действия во времени.

ЗАПОМНИ ЭТИ ТРИ СЛОВА:

• Then [зэн] - Затем / Потом
• After that [а́фтэр зэт] - После этого
• Finally [фа́йнали] - В конце концов / Наконец

ФОРМУЛА ИДЕАЛЬНОГО ПРЕДЛОЖЕНИЯ:
Время суток + Частотное слово + Действие

Посмотри, как круто эти элементы оживляют простые глаголы:
In the morning I usually wake up at 7 AM. Then I work. (Утром я обычно просыпаюсь в 7 утра. Затем я работаю).

Без слов "usually" и "then" речь звучала бы обрывисто, как у робота!`,
        button_text: "Понятно, дальше ➡️"
      }
    },
    {
      order_num: 3,
      step_type: "theory",
      content: {
        text: `📖 РЕАЛЬНЫЙ ТЕКСТ: МОНОЛОГ О СВОЕМ ДНЕ

Посмотри, какой классный и лаконичный текст "My Day" получился у нашего студента. Это твой готовый шаблон для общения:

"Every day I wake up early. In the morning I always drink coffee and then I work. After that I usually eat with my friends. In the evening we sometimes play video games. Finally, I sleep 8 hours."

🇷🇺 ПЕРЕВОД ДЛЯ ПРОВЕРКИ:

"Каждый день я просыпаюсь рано. Утром я всегда пью кофе, а затем работаю. После этого я обычно ем со своими друзьями. Вечером мы иногда играем в видеоигры. Наконец, я сплю 8 часов."

💡 ВАЖНЫЙ СЛОВАРНЫЙ ЛАЙФХАК:
Обрати внимание на фразы про время суток. Они всегда используются с предлогом "in" и артиклем "the":
• In the morning - Утром
• In the afternoon - Днем
• In the evening - Вечером
Исключение только одно: ночью мы говорим At night [эт найт]. Запомни это маленькое правило!

🔥 Твое мини-задание: Скажи вслух, что ты делаешь утром, используя связку "then". Например: "In the morning I wake up, then I work".`,
        button_text: "Перейти к тестам ➡️"
      }
    },
    {
      order_num: 4,
      step_type: "quiz_choice",
      content: {
        question: "Тебе нужно сказать иностранному коллеге: «После этого я обычно работаю». Какой вариант перевода будет абсолютно верным?",
        options: [
          { id: "a", text: "After that I usually work", is_correct: true },
          { id: "b", text: "Then I usually work", is_correct: false },
          { id: "c", text: "After that I work usually", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ - «After that I usually work». Фраза «After that» переводится как «После этого» (в отличие от «Then» - затем), а частотное слово «usually» должно стоять строго перед глаголом действия."
      }
    },
    {
      order_num: 5,
      step_type: "quiz_choice",
      content: {
        question: "Какая фраза переводится как «Утром я всегда пью кофе»? Будь внимателен к предлогам времени суток!",
        options: [
          { id: "a", text: "At the morning I always drink coffee", is_correct: false },
          { id: "b", text: "In the morning I always drink coffee", is_correct: true },
          { id: "c", text: "In the morning I drink always coffee", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ - «In the morning I always drink coffee». Время суток «утром» требует строгого шаблона «In the morning», а частотное слово «always» обязано стоять перед глаголом «drink»."
      }
    },
    {
      order_num: 6,
      step_type: "quiz_choice",
      content: {
        question: "Твой коллега рассказывает про распорядок дня своего тимлида: «He wakes up early, then he ... to work». Какое слово пропущено?",
        options: [
          { id: "a", text: "go", is_correct: false },
          { id: "b", text: "goes", is_correct: true },
          { id: "c", text: "is go", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ - «goes». Поскольку речь идет о нем (He), к глаголу go в настоящем времени Present Simple обязательно добавляется окончание -es. Никаких лишних «is» перед действием ставить нельзя."
      }
    }
  ]
};