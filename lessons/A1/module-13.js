export const A1_LESSON_13 = {
  id: 13,
  level_id: 1,
  order_num: 13,
  title: "Распорядок дня",
  description: "Научитесь описывать свой обычный день, планировать дела и понимать, как устроен график иностранцев.",
  is_premium: 0,
  steps: [
    {
      order_num: 1,
      step_type: "theory",
      content: {
        text: `🎬 ВИДЕО-БЛОГ ОТ LEXI: ТВОЙ ОБЫЧНЫЙ ДЕНЬ

Привет! На связи Лекси. Сегодня мы разберем тему, которая превратит Вашу сухую грамматику в живой и плавный рассказ. Мы поговорим о распорядке дня (Daily Routine).

Проснулись, пошли на учебу или работу, перекусили, легли спать - это те кирпичики, из которых состоит жизнь любого человека на планете. Освоив эти фразы, вы сможете легко поддержать беседу о привычках и графике.

Включайте видео! Мы разберем, как правильно соединять глаголы расписания с уже изученным временем Present Simple, и отработаем произношение до автоматизма.`,
        video_url: "https://vk.com/video-230370533_456239037",
        vk_attachment: "video-230370533_456239037", 
        button_text: "К теории ➡️"
      }
    },
    {
      order_num: 2,
      step_type: "theory",
      content: {
        text: `✨ УРОК 13. РАСПОРЯДОК ДНЯ И РУТИНА

Чтобы описать свой день, нам понадобятся 5 базовых глаголов действия. Давай разберем их и сразу вспомним наши правила Present Simple!

ТВОЙ НАБОР НА КАЖДЫЙ ДЕНЬ:

• Wake up [уэйк ап] - просыпаться / открывать глаза.
Пример: I wake up early. (Я просыпаюсь рано).

• Go to school [гоу ту скул] - идти в школу / учиться.
Пример: You go to school. (Ты ходишь в школу).

• Work [уёрк] - работать.
Пример: We work every day. (Мы работаем каждый день).

• Eat [ит] - есть / кушать.
Пример: They eat pizza. (Они едят пиццу).

• Sleep [слип] - спать.
Пример: I sleep 8 hours. (Я сплю 8 часов).

⚠️ ВСПОМИНАЕМ ГЛАВНУЮ ЛОВУШКУ HE / SHE / IT:
Если день описываешь не ты сам, а твой друг, брат или сестра, не забывай добавлять окончание -S к глаголу!
• He wakes up [хи уэйкс ап] - Он просыпается.
• She goes to school [ши гоуз ту скул] - Она ходит в школу (у слова go окончание превращается в -es).
• It works [ит уёркс] - Это работает.`,
        button_text: "Понятно, дальше ➡️"
      }
    },
    {
      order_num: 3,
      step_type: "theory",
      content: {
        text: `📖 ЖИВОЙ МИКРО-ДИАЛОГ: ОБСУЖДАЕМ ГРАФИК

Давай послушаем, как два друга, Алекс и Том, сравнивают свои совершенно разные графики жизни во время вечернего созвона:

Alex: Tom, what is your daily routine? 
Tom: Well, I wake up early. I go to school at 8 AM. And you?
Alex: Oh, I'm a developer, so I don't go to school. I work from home. 
Tom: Nice! When do you eat and sleep?
Alex: I eat at 2 PM and I sleep 6 hours. My cat sleeps 15 hours!
Tom: Wow! Your cat has a great routine!

🇷🇺 ПЕРЕВОД ДЛЯ ПРОВЕРКИ:

Алекс: Том, какой у тебя распорядок дня?
Том: Ну, я просыпаюсь рано. Я хожу в школу в 8 утра. А ты?
Алекс: О, я разработчик, так что я не хожу в школу. Я работаю из дома.
Том: Круто! А когда ты ешь и спишь?
Алекс: Я ем в 2 часа дня и сплю 6 часов. А мой кот спит 15 часов!
Том: Вау! У твоего кота отличный график!

💡 ПОЛЕЗНЫЙ ЯЗЫКОВОЙ ЛАЙФХАК:
Обрати внимание на фразу "go to school". Англичане никогда не ставят артикль "the" перед словами school (школа) или work (работа), если имеют в виду процесс учебы или труда по расписанию. Мы говорим просто: go to school или go to work. Запомни это!

🔥 Твое мини-задание: Составь вслух одно предложение про свой график прямо сейчас. Например: "I wake up and work". Сделай это легко!`,
        button_text: "Перейти к тестам ➡️"
      }
    },
    {
      order_num: 4,
      step_type: "quiz_choice",
      content: {
        question: "Какое предложение составлено абсолютно правильно, если мы хотим сказать: «Мой брат просыпается рано»?",
        options: [
          { id: "a", text: "My brother wake up early", is_correct: false },
          { id: "b", text: "My brother wakes up early", is_correct: true },
          { id: "c", text: "My brother is wake up early", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ - «My brother wakes up early». Мой брат - это он (He), поэтому к глаголу wake по правилам настоящего времени Present Simple послушно добавляется окончание -s."
      }
    },
    {
      order_num: 5,
      step_type: "quiz_choice",
      content: {
        question: "Как правильно перевести на английский язык фразу: «Они ходят в школу каждый день»?",
        options: [
          { id: "a", text: "They go to school every day", is_correct: true },
          { id: "b", text: "They goes to school every day", is_correct: false },
          { id: "c", text: "They go to the school every day", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ - «They go to school every day». С местоимением Они (They) глагол остается чистым (go), а перед словом school артикль ставить не нужно."
      }
    },
    {
      order_num: 6,
      step_type: "quiz_choice",
      content: {
        question: "Переведи предложение, обращая внимание на правила для третьего лица: «Она спит 8 часов».",
        options: [
          { id: "a", text: "She sleep 8 hours", is_correct: false },
          { id: "b", text: "She sleeps 8 hours", is_correct: true },
          { id: "c", text: "She is sleep 8 hours", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ - «She sleeps 8 hours». Подлежащее Она (She) требует от глагола окончания -s на конце. Лишний глагол «is» сюда добавлять не нужно."
      }
    }
  ]
};