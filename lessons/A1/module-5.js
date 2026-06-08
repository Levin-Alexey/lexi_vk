export const A1_LESSON_5 = {
  id: 5,
  level_id: 1,
  order_num: 5,
  title: "Мини-диалог: знакомство",
  description: "Объединяем все знания в один живой разговор. Научитесь задавать простые вопросы о себе и легко отвечать собеседнику.",
  is_premium: 0,
  steps: [
    {
      order_num: 1,
      step_type: "theory",
      content: {
        text: `🎬 ВИДЕО-ПРАКТИКА С LEXI: ЖИВОЙ РАЗГОВОР

Привет! Вы уже знаете отдельные фразы, умеете называть имя, свою страну и использовать глагол to be. Настало время объединить все это в один классный, плавный диалог.

Сегодня мы научимся не просто отвечать на вопросы, а вести полноценную легкую беседу при знакомстве с иностранцем в чате или на созвоне.

Lexi записала короткое видео, котороеразберет, как звучит живой диалог на слух, покажет правильную интонацию вопросов и подскажет, как отвечать на автомате, не задумываясь над каждым словом.`,
        video_url: "https://vk.com/video-230370533_456239028",
        vk_attachment: "video-230370533_456239028", 
        button_text: "К теории ➡️"
      }
    },
    {
      order_num: 2,
      step_type: "theory",
      content: {
        text: `✨ УРОК 5. МИНИ-ДИАЛОГ: КОНСТРУКТОР ЗНАКОМСТВА

Чтобы уверенно общаться, тебе нужен четкий набор шаблонов. Давай соберем твой личный конструктор для первого разговора.

4 ГЛАВНЫХ ВОПРОСА И ОТВЕТА:

1. Как спросить имя:
• What is your name? [уóт из юэ нэйм] - Как тебя зовут?
• Ответ: I'm Alex или My name is Alex.

2. Как спросить, как дела:
• How's it going? [хауз ит гóуинг] - Как дела? / Как оно?
• Ответ: I'm good, thanks! [айм гуд, тэнкс] - Все хорошо, спасибо!

3. Как спросить про страну:
• Where are you from? [уэ́ар ар ю фром] - Откуда ты?
• Ответ: I'm from Russia [айм фром ра́ша] - Я из России.

4. Как проявить вежливость:
• Nice to meet you [найс ту мит ю] - Приятно познакомиться.
• Ответ: Nice to meet you too [найс ту мит ю ту] - Мне тоже приятно познакомиться.`,
        button_text: "Понятно, дальше ➡️"
      }
    },
    {
      order_num: 3,
      step_type: "theory",
      content: {
        text: `📖 СЛУШАЕМ И ЧИТАЕМ: РЕАЛЬНЫЙ ДИАЛОГ

Представь: ты заходишь на международный созвон или в рабочий чат, и к тебе обращается зарубежный коллега по имени Стив. Вот как выглядит ваш идеальный первый диалог:

Steve: Hello! What is your name?
Aleksey: Hi! I'm Aleksey. And you?
Steve: My name is Steve. Nice to meet you, Aleksey!
Aleksey: Nice to meet you too, Steve! Where are you from?
Steve: I'm from England. And where are you from?
Aleksey: I'm from Russia.
Steve: Awesome! How's it going?
Aleksey: I'm good, thanks! How are you?
Steve: I'm fine, thank you!

🇷🇺 ПЕРЕВОД ДЛЯ ПРОВЕРКИ:

Стив: Привет! Как тебя зовут?
Алексей: Привет! Я Алексей. А тебя?
Стив: Меня зовут Стив. Приятно познакомиться, Алексей!
Алексей: Мне тоже приятно познакомиться, Стив! Откуда ты?
Стив: Я из Англии. А ты откуда?
Алексей: Я из России.
Стив: Круто! Как дела?
Алексей: Все хорошо, спасибо! Как твои дела?
Стив: У меня все отлично, спасибо!

💡 ЛАЙФХАК ДЛЯ ЖИВОЙ БЕСЕДЫ:
Обрати внимание на фразу "And you?" [энд ю] (А ты? / А у тебя?). Это супер-оружие новичка. Вместо того чтобы полностью повторять длинный вопрос "Where are you from?", ты просто отвечаешь на него и бросаешь мяч собеседнику коротким "And you?". Это делает речь естественной!`,
        button_text: "Перейти к тестам ➡️"
      }
    },
    {
      order_num: 4,
      step_type: "quiz_choice",
      content: {
        question: "Собеседник улыбнулся и сказал тебе при знакомстве: «Nice to meet you!». Какой ответ будет самым правильным и вежливым?",
        options: [
          { id: "a", text: "Nice to meet you too", is_correct: true },
          { id: "b", text: "I'm from Russia", is_correct: false },
          { id: "c", text: "How's it going?", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ - «Nice to meet you too» (Мне тоже приятно познакомиться). Остальные фразы невпопад: одна про страну, а вторая - вопрос про дела."
      }
    },
    {
      order_num: 5,
      step_type: "quiz_choice",
      content: {
        question: "Как коротко, вежливо и по-современному задать встречный вопрос собеседнику, чтобы узнать, откуда он родом?",
        options: [
          { id: "a", text: "And you?", is_correct: true },
          { id: "b", text: "What is your name?", is_correct: false },
          { id: "c", text: "Good evening", is_correct: false }
        ],
        explanation_if_wrong:
          "Короткий вопрос «And you?» (А ты?) идеально подходит для того, чтобы вернуть собеседнику его же вопрос, не переспрашивая его полностью."
      }
    },
    {
      order_num: 6,
      step_type: "quiz_choice",
      content: {
        question: "Посмотри на кусочек диалога:\nSteve: What is your name?\nTom: ...\nКакая фраза идеально подойдет на место пропуска?",
        options: [
          { id: "a", text: "Good night, Steve", is_correct: false },
          { id: "b", text: "I'm Tom", is_correct: true },
          { id: "c", text: "I am from Turkey", is_correct: false }
        ],
        explanation_if_wrong:
          "Стив спрашивает имя («What is your name?»), поэтому логичный ответ - назвать себя: «I'm Tom» (Я Том)."
      }
    }
  ]
};