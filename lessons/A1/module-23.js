export const A1_LESSON_23 = {
  id: 23,
  level_id: 1,
  order_num: 23,
  title: "Комната и предметы",
  description: "Изучите базовые слова для описания своего рабочего места, комнаты или содержимого сумки.",
  is_premium: 0,
  steps: [
    {
      order_num: 1,
      step_type: "theory",
      content: {
        text: `🎬 СЛОВАРНЫЙ РОК ОТ LEXI: ОКРУЖАЮЩИЙ МИР

Привет! На связи Lexi. Вы уже умеете строить сложные конструкции, говорить, что и где находится, указывать на предметы вдали и вблизи. Настало время мощно расширить ваш словарный запас!

Сегодня мы изучим 6 главных слов, из которых состоит любое рабочее пространство, офис или жилая комната. Телефон, компьютер, стол, стул - это то, с чем вы взаимодействуете каждую секунду.

Включайте короткое видео! Мы разберем правильное произношение этих существительных, чтобы вы не путали похожие звуки, и сразу научимся соединять их с уже изученной грамматикой.`,
        video_url: "https://vk.com/video-230370533_456239047",
        vk_attachment: "video-230370533_456239047", 
        button_text: "К теории ➡️"
      }
    },
    {
      order_num: 2,
      step_type: "theory",
      content: {
        text: `✨ УРОК 23. КОМНАТА И ПРЕДМЕТЫ

Давай добавим в твой арсенал 6 незаменимых существительных. Обрати внимание на произношение каждого слова!

ТВОЙ НОВЫЙ СЛОВАРНЫЙ НАБОР:

• Room [рум] - комната / кабинет.
Пример: There is a clean room. (Это чистая комната).

• Table [тэйбл] - стол.
Пример: There is a laptop on the table. (На столе стоит ноутбук).

• Chair [чэар] - стул / кресло.
Пример: This chair is comfortable. (Этот стул удобный).

• Phone [фоун] - телефон.
Пример: Where is my phone? (Где мой телефон?).

• Computer [кэмпью́тэр] - компьютер.
Пример: That computer is very fast. (Тот компьютер очень быстрый).

• Bag [бэг] - сумка / рюкзак.
Пример: Your keys are in the bag. (Твои ключи в сумке).

💡 ИНТЕГРАЦИЯ ЗНАНИЙ:
Посмотри, как легко эти слова сочетаются с конструкцией "There is":
There is a phone and a computer in my room. (В моей комнате есть телефон и компьютер).`,
        button_text: "Понятно, дальше ➡️"
      }
    },
    {
      order_num: 3,
      step_type: "theory",
      content: {
        text: `📖 ЖИВОЙ МИКРО-ДИАЛОГ: ПОИСК ВЕЩЕЙ ПЕРЕД ВЫХОДОМ

Давай послушаем, как менеджер Сэм помогает дизайнеру Софии найти ее вещи в рабочем кабинете перед важной встречей с клиентами:

Sofia: Sam, please help me. I don't see my bag. Is it in this room?
Sam: Look, Sofia! There is a brown bag under the table. Is it your bag?
Sofia: Oh, yes, it is! Thank you. And where is my phone?
Sam: Your phone is on the chair. Near your computer.
Sofia: Perfect! Now I am ready for the meeting. Let's go!

🇷🇺 ПЕРЕВОД ДЛЯ ПРОВЕРКИ:

София: Сэм, пожалуйста, помоги мне. Я не вижу свою сумку. Она в этой комнате?
Сэм: Посмотри, София! Под столом стоит коричневая сумка. Это твоя сумка?
София: О, да! Спасибо. А где мой телефон?
Сэм: Твой телефон на стуле. Рядом с твоим компьютером.
София: Прекрасно! Теперь я готова к встрече. Пошли!

💡 ФОНЕТИЧЕСКИЙ ЛАЙФХАК: БЕРЕГИСЬ ЛОВУШКИ С БУКВОЙ «А»
Обрати особое внимание на слово Bag (сумка). Буква "a" здесь произносится как широкий, открытый звук [э]. Нужно широко открыть рот, как на приеме у врача. 
Если ты произнесешь это слово узко и зажато, как русский звук [е], у тебя получится слово Beg [бег], которое переводится как "просить" или "умолять". Будь аккуратен, чтобы тебя поняли правильно!

🔥 Твое мини-задание: Посмотри на свою комнату. Найди глазами компьютер и телефон и скажи вслух фразу: "This is my computer and this is my phone". Прокачай произношение!`,
        button_text: "Перейти к тестам ➡️"
      }
    },
    {
      order_num: 4,
      step_type: "quiz_choice",
      content: {
        question: "Коллега в офисе спросил тебя: «Where is the computer?». Как правильно ответить ему: «Компьютер на столе»?",
        options: [
          { id: "a", text: "The computer is on the table", is_correct: true },
          { id: "b", text: "The computer is on the chair", is_correct: false },
          { id: "c", text: "The computer is in the bag", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ - «The computer is on the table». Слово «table» переводится как стол. Вариант B означает «на стуле», а вариант C - «в сумке»."
      }
    },
    {
      order_num: 5,
      step_type: "quiz_choice",
      content: {
        question: "Переведи на английский язык вопрос, соблюдая правила порядка слов для глагола to be: «Мой телефон в сумке?»",
        options: [
          { id: "a", text: "My phone is in the bag?", is_correct: false },
          { id: "b", text: "Is my phone in the bag?", is_correct: true },
          { id: "c", text: "Is my phone on the table?", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ - «Is my phone in the bag?». В вопросах с глаголом to be форма «is» обязана встать на первое место. Предлог «in» означает «внутри», а «bag» - это сумка."
      }
    },
    {
      order_num: 6,
      step_type: "quiz_choice",
      content: {
        question: "Посмотри на предложение: «There are two ... in the room». Какое слово идеально подходит в пропуск по правилам множественного числа?",
        options: [
          { id: "a", text: "chair", is_correct: false },
          { id: "b", text: "table", is_correct: false },
          { id: "c", text: "chairs", is_correct: true }
        ],
        explanation_if_wrong:
          "Правильный ответ - «chairs». Конструкция «There are» и числительное «two» (два) строго требуют использования существительного во множественном числе, то есть с окончанием -s на конце."
      }
    }
  ]
};