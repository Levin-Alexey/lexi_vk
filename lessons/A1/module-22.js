export const A1_LESSON_22 = {
  id: 22,
  level_id: 1,
  order_num: 22,
  title: "Конструкция There is / There are",
  description: "Научитесь описывать пространство вокруг себя, говорить, что и где находится в комнате, офисе или городе.",
  is_premium: 0,
  steps: [
    {
      order_num: 1,
      step_type: "theory",
      content: {
        text: `🎬 ВИДЕО-УРОК ОТ LEXI: МИР ВОКРУГ ТЕБЯ

Привет! На связи Lexi. Представьте, что вам нужно описать свой рабочий кабинет, квартиру для аренды или рассказать иностранному коллеге, что в вашем офисе есть кофемашина и два удобных кресла.

В русском языке мы говорим обычным путем: "На столе стоит ноутбук" или "В комнате есть два стула". Мы начинаем с места. В английском языке для этого существует специальная и очень популярная конструкция, которая буквально переворачивает логику предложения с ног на голову.

Включайте короткое видео! Я научу вас смотреть на пространство глазами англичанина и покажу, как легко описывать любые локации без долгих раздумий над структурой.`,
        video_url: "https://vk.com/video-230370533_456239046",
        vk_attachment: "video-230370533_456239046", 
        button_text: "К теории ➡️"
      }
    },
    {
      order_num: 2,
      step_type: "theory",
      content: {
        text: `✨ УРОК 22. КОНСТРУКЦИЯ THERE IS / THERE ARE

Сама по себе фраза "There is" или "There are" переводится как "там есть" или "существует". Мы используем ее всегда, когда хотим заявить: в таком-то месте находится такой-то предмет.

ВЫБОР ЗАВИСИТ ТОЛЬКО ОТ КОЛИЧЕСТВА ПРЕДМЕТОВ:

1. Если предмет ОДИН (Единственное число):
• THERE IS... [зэар из]
Пример: There is a table in the room. [зэар из а тэйбл ин зэ рум] - В комнате есть стол.

2. Если предметов ДВА И БОЛЕЕ (Множественное число):
• THERE ARE... [зэар ар]
Пример: There are two chairs near the table. [зэар ар ту чэарз ни́ар зэ тэйбл] - Возле стола стоят два стула.

⚠️ ЗОЛОТОЕ ПРАВИЛО ПЕРЕВОДА НА РУССКИЙ:
Запомни классный секрет: английское предложение начинается с конструкции "There is/are", а вот переводить его на русский язык правильнее и красивее всего с самого КОНЦА - то есть с места действия!
• Англичане говорят: Есть стол в комнате.
• Мы переводим: В комнате есть стол.`,
        button_text: "Понятно, дальше ➡️"
      }
    },
    {
      order_num: 3,
      step_type: "theory",
      content: {
        text: `📖 ЖИВОЙ МИКРО-ДИАЛОГ: ПРОВЕРКА НОВОГО ОФИСА

Давай послушаем, как проджект-менеджер Сэм и дизайнер София осматривают свой новый кабинет в ИТ-технопарке:

Sam: Sofia, welcome to our new room! What do you think?
Sofia: Wow, it is great! There is a big window and there is a modern whiteboard on the wall.
Sam: Yes! And look at the workplaces. There is a clean desk for you.
Sofia: Perfect! But where are the seats?
Sam: Don't worry. There are two comfortable chairs near the window. And there are three monitors in those boxes!
Sofia: Awesome! I love this place.

🇷🇺 ПЕРЕВОД ДЛЯ ПРОВЕРКИ:

Сэм: София, добро пожаловать в наш новый кабинет! Что думаешь?
София: Вау, он отличный! В комнате есть большое окно, а на стене висит современная маркерная доска. (в оригинале - There is a window, there is a whiteboard)
Сэм: Да! И посмотри на рабочие места. Для тебя тут есть чистый стол. (There is a clean desk)
София: Прекрасно! Но где сиденья?
Сэм: Не переживай. У окна стоят два удобных стула. А в тех коробках лежат три монитора! (There are two chairs, there are three monitors)
София: Круто! Мне нравится это место.

💡 РАЗГОВОРНЫЙ СУПЕР-ЛАЙФХАК:
В реальной жизни никто не говорит длинное "There is". Носители сокращают его до короткого слова There's [зэарз].
Пример: There's a laptop on my desk. (На моем столе стоит ноутбук).

А что делать, если ты перечисляешь разные предметы? Например: "На столе стоит один ноутбук и две чашки". Что выбрать: is или are? 
Запомни правило первого соседа! Мы выбираем форму по самому первому предмету в списке. Ноутбук один? Значит говорим: There is a laptop and two cups.

🔥 Твое мини-задание: Посмотри на свой рабочий стол прямо сейчас. Найди один главный предмет и назови его вслух по нашей формуле. Например: "There is a phone on my desk". Почувствуй логику языка!`,
        button_text: "Перейти к тестам ➡️"
      }
    },
    {
      order_num: 4,
      step_type: "quiz_choice",
      content: {
        question: "Тебе нужно описать свое рабочее место иностранному коллеге и сказать: «На столе стоит ноутбук». Какое слово нужно вставить в пропуск: «There ... a laptop on the desk»?",
        options: [
          { id: "a", text: "is", is_correct: true },
          { id: "b", text: "are", is_correct: false },
          { id: "c", text: "am", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ - «is». Поскольку ноутбук (a laptop) один и находится в единственном числе, мы используем конструкцию «There is»."
      }
    },
    {
      order_num: 5,
      step_type: "quiz_choice",
      content: {
        question: "Ты заходишь в переговорную комнату и видишь там несколько человек. Как правильно сказать на английском: «В комнате находятся три разработчика»?",
        options: [
          { id: "a", text: "There is three developers in the room", is_correct: false },
          { id: "b", text: "There are three developers in the room", is_correct: true },
          { id: "c", text: "There am three developers in the room", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ - «There are three developers in the room». Разработчиков трое (множественное число), поэтому мы обязательно выбираем форму «There are»."
      }
    },
    {
      order_num: 6,
      step_type: "quiz_choice",
      content: {
        question: "Переведи предложение на английский язык, соблюдая правильный порядок слов: «В офисе есть кофемашина».",
        options: [
          { id: "a", text: "In the office there is a coffee machine", is_correct: false },
          { id: "b", text: "A coffee machine is there in the office", is_correct: true },
          { id: "c", text: "There is a coffee machine in the office", is_correct: true }
        ],
        explanation_if_wrong:
          "Правильный ответ - «There is a coffee machine in the office». По строгим правилам английской грамматики предложение, указывающее на наличие предмета в пространстве, должно начинаться именно с конструкции «There is»."
      }
    }
  ]
};