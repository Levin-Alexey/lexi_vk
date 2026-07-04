export const A2_LESSON_1 = {
  id: 31,
  level_id: 2,
  order_num: 1,
  title: "Повторение Present Simple (Уровень А2)",
  description: "Добро пожаловать на уровень А2! Уверенно закрепите базу настоящего времени, автоматизируйте сложные окончания и разберите продвинутый нюанс расположения частотных слов.",
  is_premium: 0,
  steps: [
    {
      order_num: 1,
      step_type: "theory",
      content: {
        text: `🎬 НОВЫЙ ЭТАП С LEXI: ПЕРЕХОД НА УРОВЕНЬ А2

Привет! На связи Lexi. Я поздравляю Вас с переходом на следующую ступень - уровень А2! Это уровень уверенного базового общения, где мы будем учиться говорить более развернуто, профессионально и глубоко.

И начнем мы с перезагрузки Present Simple. Вы уже знаете основы, но на уровне А2 наша цель - довести их до полного автоматизма, убрать мелкие досадные ошибки и разобрать один коварный нюанс, на котором спотыкаются даже сильные студенты.

Включайте видео! Мы быстро прокрутим ключевые правила, настроим ваш речевой процессор на новые конструкции и сразу внедрим их в практику.`,
        video_url: "https://vk.com/video-230370533_456239056",
        vk_attachment: "video-230370533_456239056", 
        button_text: "К глубокой теории ➡️"
      }
    },
    {
      order_num: 2,
      step_type: "theory",
      content: {
        text: `✨ УРОК 31. РЕФРЕШ PRESENT SIMPLE И НОВЫЙ НЮАНС

Давай быстро соберем в единую матрицу то, что должно отскакивать от зубов:
• Утверждение: I work / He works (помни про хвостик -s/-es для He, She, It).
• Отрицание: I don't work / She doesn't work (помощник doesn't съедает окончание -s!).
• Вопрос: Do you work? / Does he work? (помощник Does забирает -s себе).

🔥 ГЛАВНЫЙ СЕКРЕТ УРОВНЯ А2: ЛОВУШКА ГЛАГОЛА TO BE
Вспомни правило из уровня А1: частотные слова (always, usually, often, never) ставятся строго ПЕРЕД обычными глаголами действия. 
Пример: I always drink coffee. He never plays games.

Но если в предложении главным является сильный глагол TO BE (am, is, are), это правило переворачивается! Частотные слова обязаны стоять ПОСЛЕ глагола to be.

СРАВНИ ДВА ВАРИАНТА:
1. С обычным глаголом: He never arrives late. (Частотное слово ПЕРЕД глаголом).
2. С глаголом to be: He is never late. (Частотное слово ПОСЛЕ глагола).

Запомни эту разницу, именно она отличает студента уровня А2!`,
        button_text: "Понятно, дальше ➡️"
      }
    },
    {
      order_num: 3,
      step_type: "theory",
      content: {
        text: `📖 ЖИВОЙ МИКРО-ДИАЛОГ: ОБСУЖДЕНИЕ РАБОЧИХ ПРОЦЕССОВ

Давай послушаем разговор руководителя ИТ-проектов Алекса и тимлида Марины. Они обсуждают автоматизацию процессов и работу команды разработки:

Alex: Marina, does our new automation workflow work perfectly?
Marina: Yes, it does! It always saves our team five hours a day.
Alex: Awesome. And what about the new developer? Is he usually on time for our meetings?
Marina: Yes, he is. He is never late, and he works very fast.
Alex: Excellent. Do our clients like the new system?
Marina: Yes, they do. They often send positive feedback.

🇷🇺 ПЕРЕВОД ДЛЯ ПРОВЕРКИ:

Алекс: Марина, наш новый процесс автоматизации работает идеально? (в оригинале - does... work)
Марина: Да! Он всегда экономит нашей команде по пять часов в день. (it always saves)
Алекс: Потрясающе. А как насчет нового разработчика? Он обычно вовремя приходит на наши созвоны? (Is he usually — обрати внимание на порядок слов!)
Марина: Да. Он никогда не опаздывает и работает очень быстро. (He is never late — слово never после is)
Алекс: Отлично. Нашим клиентам нравится новая система? (Do our clients like)
Марина: Да. Они часто присылают положительные отзывы.

💡 РЕЧЕВОЙ ЛАЙФХАК ДЛЯ БИЗНЕСА:
Вместо базового слова "good" на уровне А2 старайся использовать более точные и солидные слова. Например, "perfectly" (идеально), "fast" (быстро) или phrase "on time" (вовремя). Это сразу поднимет уровень твоего общения в глазах зарубежных коллег.

🔥 Твое мини-задание: Скажи вслух фразу "Я никогда не опаздываю", правильно расположив слово never после глагола to be: "I am never late". Повтори это уверенно!`,
        button_text: "Перейти к тестам ➡️"
      }
    },
    {
      order_num: 4,
      step_type: "quiz_choice",
      content: {
        question: "Тебе нужно сказать зарубежному партнеру: «Наш сервер всегда доступен». Выбери вариант с грамматически верным порядком слов уровня А2:",
        options: [
          { id: "a", text: "Our server always is available.", is_correct: false },
          { id: "b", text: "Our server is always available.", is_correct: true },
          { id: "c", text: "Our server always available.", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ - «Our server is always available.». На уровне А2 важно помнить, что частотные слова (always) в предложениях с глаголом-связкой to be (is) должны стоять строго ПОСЛЕ него."
      }
    },
    {
      order_num: 5,
      step_type: "quiz_choice",
      content: {
        question: "Как правильно спросить коллегу на утреннем планировании: «Твоя команда тестирует код каждый день?»?",
        options: [
          { id: "a", text: "Does your team test the code every day?", is_correct: true },
          { id: "b", text: "Does your team tests the code every day?", is_correct: false },
          { id: "c", text: "Do your team test the code every day?", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ - «Does your team test the code every day?». Команда (team) — это единый организм, собирательное существительное, которое в данном контексте выступает как «оно» (It). Поэтому нужен помощник Does, который полностью забирает окончание -s у глагола test."
      }
    },
    {
      order_num: 6,
      step_type: "quiz_choice",
      content: {
        question: "Найди предложение, в котором допущена серьезная грамматическая ошибка:",
        options: [
          { id: "a", text: "She doesn't manage the team on weekends.", is_correct: false },
          { id: "b", text: "We usually launch our product in May.", is_correct: false },
          { id: "c", text: "Our AI school doesn't has any issues.", is_correct: true }
        ],
        explanation_if_wrong:
          "Ошибка допущена в предложении «Our AI school doesn't has any issues.». Отрицательный помощник doesn't уже забрал в себя окончание -s, поэтому глагол «иметь» обязан вернуться в свою чистую начальную форму — have. Правильно: doesn't have."
      }
    }
  ]
};