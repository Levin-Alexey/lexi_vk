export const A2_LESSON_27 = {
  id: 57,
  level_id: 2,
  order_num: 27,
  title: "Present Continuous для действий сейчас",
  description: "Научитесь описывать процессы, происходящие прямо в секунду речи, координировать команду на созвонах в реальном времени и избегать багов со статичными глаголами.",
  is_premium: 0,
  steps: [
    {
      order_num: 1,
      step_type: "theory",
      content: {
        text: `🎬 СТАТУС-ДЕЛ В РЕАЛЬНОМ ВРЕМЕНИ С LEXI: ПРЯМОЙ ЭФИР

Привет! На связи Lexi. До сих пор мы использовали время Present Simple, чтобы говорить о регулярных делах, рутине и стабильных параметрах нашей работы. Но в ИТ-бизнесе постоянно возникают ситуации, когда нужно описать то, что происходит прямо сейчас, в эту самую секунду.

Представьте созвон по статусу проекта (standup). Вас спрашивают: «Над чем вы работаете?». Ответ в Present Simple будет звучать так, будто вы делаете это вообще по жизни, а не прямо в данный момент. Чтобы сказать: «Я компилирую код», «Марина обсуждает ТЗ с клиентом», «Сервер прямо сейчас перезапускается», нам понадобится время Present Continuous (Настоящее длительное).

Включайте видео! Мы разберем архитектуру "живого" процесса, научимся собирать формулы сборки этого времени и внедрим его в ваши ежедневные рабочие отчеты.`,
        video_url: "https://vk.com/video-230370533_456239083",
        vk_attachment: "video-230370533_456239083",
        button_text: "К сборке формул ➡️"
      }
    },
    {
      order_num: 2,
      step_type: "theory",
      content: {
        text: `✨ УРОК 27. АРХИТЕКТУРА И ФОРМУЛЫ PRESENT CONTINUOUS

В отличие от простого времени, Present Continuous всегда требует двух компонентов: глагола-помощника TO BE (который меняет форму в зависимости от того, кто совершает действие) и основного глагола с окончанием -ING.

ДАВАЙ РАЗБЕРЕМ ТРИ КЛАССИЧЕСКИЕ СТРУКТУРЫ:

1. Утверждение: Кто + am / is / are + Глагол с окончанием -ING
• I am (I'm) coding. (Я пишу код прямо сейчас).
• He/She/It is ('s) deploying. (Он/Она выкатывает обновление в эту секунду).
• We/You/They are ('re) testing. (Мы/Вы/Они тестируем систему в данный момент).

💡 Правила правописания окончания -ing:
- Если глагол оканчивается на немую -e, она стирается: write -> writing, optimize -> optimizing.
- Если короткий глагол оканчивается на ударный закрытый слог, последняя буква удваивается: run -> running, stop -> stopping.

2. Отрицание: Добавляем частицу NOT строго после am / is / are
• The automated bot is not (isn't) sending metrics right now. (Автоматизированный бот не отправляет метрики прямо сейчас).
• We are not (aren't) resting at the moment. (Мы не отдыхаем в данный момент).

3. Вопрос: Выносим am / is / are на самое первое место
• Are you checking the D1 database logs? (Ты проверяешь логи базы данных D1?).
• What is our lead developer building right now? (Что наш ведущий разработчик создает прямо сейчас?).

🔥 ГЛАВНАЯ ЛОВУШКА УРОВНЯ А2: ГЛАГОЛЫ СОСТОЯНИЯ (STATIVE VERBS)
Запомни железное инженерное правило: существует группа глаголов, которые обозначают состояние, а не физический процесс. Их КАТЕГОРИЧЕСКИ НЕЛЬЗЯ использовать в Continuous, даже если это происходит прямо сейчас! К ним относятся: know (знать), want (хотеть), understand (понимать), like (нравиться), have (иметь — в значении владения).
• Ошибка: I am understanding the bug right now.
• Правильно: I understand the bug right now. (Используем Present Simple!).`,
        button_text: "Понятно, дальше ➡️"
      }
    },
    {
      order_num: 3,
      step_type: "theory",
      content: {
        text: `📖 ЖИВОЙ МИКРО-ДИАЛОГ: ОПЕРАТИВНЫЙ СОЗВОН ВО ВРЕМЯ СПРИНТА

Давай послушаем, как основатель ИТ-агентства Алекс и менеджер Марина координируют работу команды в режиме реального времени, пока запущенный юзербот-парсер собирает лиды в Telegram и ВК:

Alex: Marina, hi! I am looking at our live dashboard right now. Why are the data metrics changing so fast?
Marina: Hi Alex! That's because our new multi-agent system is actively collecting metrics from Wildberries and Ozon at the moment. 
Alex: Awesome! Is our lead developer monitoring the server load?
Marina: Yes, he is. He is checking the cloud infrastructure parameters right now. He isn't resting today because we need a stable deployment.
Alex: Great. And what are you doing? Are you writing the weekly tech report for the sellers?
Marina: No, I'm not writing it yet. I am waiting for the final API tokens from our client. But I already understand the main task.
Alex: Perfect! Keep going, you are doing a great job!

🇷🇺 ПЕРЕВОД ДЛЯ ПРОВЕРКИ:

Алекс: Марина, привет! Я смотрю на нашу живую панель управления прямо сейчас. Почему метрики данных меняются так быстро? (I am looking, are... changing — процессы в данную секунду).
Марина: Привет, Алекс! Это потому, что наша новая многоагентная система активно собирает метрики с Wildberries и Ozon в данный момент. (is... collecting).
Алекс: Потрясающе! Наш ведущий разработчик контролирует нагрузку на сервер? (Is... monitoring?)
Марина: Да. Он проверяет параметры облачной инфраструктуры прямо сейчас. Он не отдыхает сегодня, потому что нам нужен стабильный деплой. (He is checking, he isn't resting).
Алекс: Отлично. А чем занимаешься ты? Ты пишешь еженедельный технический отчет для продавцов? (are you writing?)
Марина: Нет, я его еще не пишу. Я жду финальные токены API от нашего клиента. Но я уже понимаю главную задачу. (I'm not writing, I am waiting — процессы; I understand — глагол состояния, строго в Present Simple!).
Алекс: Идеально! Продолжайте, вы делаете отличную работу!

💡 А2 ПРО-ЛАЙФХАК ДЛЯ МИТИНГОВ:
Главные маркеры-маяки, которые требуют после себя Present Continuous:
• right now / right away (прямо сейчас)
• at the moment (в данный момент)
• Currently [кáрэнтли] (в настоящее время / сейчас). Начни фразу на созвоне с: "Currently, I'm modifying the prompt structure...", и твой английский сразу зазвучит солидно и структурированно.

🔥 Твое мини-задание: Опиши свое действие в эту секунду. Произнеси вслух четко и с выражением: "I am studying English grammar right now." Зафиксируй этот живой процесс!`,
        button_text: "Перейти к тестам ➡️"
      }
    },
    {
      order_num: 4,
      step_type: "quiz_choice",
      content: {
        question: "Вы сидите на созвоне с командой Neuron_AI и вам нужно сказать: «Наш ведущий разработчик прямо сейчас обновляет параметры интеграции в коде». Выберите синтаксически безупречный вариант:",
        options: [
          { id: "a", text: "Our lead developer updates the integration parameters right now.", is_correct: false },
          { id: "b", text: "Our lead developer is updatting the integration parameters right now.", is_correct: false },
          { id: "c", text: "Our lead developer is updating the integration parameters right now.", is_correct: true }
        ],
        explanation_if_wrong:
          "Правильный ответ — «Our lead developer is updating the integration parameters right now.». Маркер «right now» требует времени Present Continuous (is + глагол с -ing). При добавлении окончания -ing к глаголу update немая буква -e на конце убирается, а удвоение согласной t здесь не требуется."
      }
    },
    {
      order_num: 5,
      step_type: "quiz_choice",
      content: {
        question: "Как правильно спросить Марину в рабочем мессенджере: «Ты сейчас проверяешь логи безопасности мини-приложения ВК?»?",
        options: [
          { id: "a", text: "Are you checking the VK mini-app security logs at the moment?", is_correct: true },
          { id: "b", text: "Do you checking the VK mini-app security logs at the moment?", is_correct: false },
          { id: "c", text: "Is you checking the VK mini-app security logs at the moment?", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ — «Are you checking the VK mini-app security logs at the moment?». В вопросительных структурах Present Continuous для местоимения «you» на первое место всегда выносится вспомогательный глагол-связка «Are»."
      }
    },
    {
      order_num: 6,
      step_type: "quiz_choice",
      content: {
        question: "Найдите предложение, в котором допущена серьезная ошибка из-за неправильного использования глагола состояния (Stative Verb) в длительной форме:",
        options: [
          { id: "a", text: "Currently, the automated system is parsing text strings safely.", is_correct: false },
          { id: "b", text: "I am knowing the correct database password right now.", is_correct: true },
          { id: "c", text: "We are waiting for the final Ozon analytics report data.", is_correct: false }
        ],
        explanation_if_wrong:
          "Ошибка допущена в варианте B! Глагол «know» (знать) выражает ментальное состояние, а не физический процесс. По правилам уровня А2 его запрещено использовать в форме Continuous (-ing). Правильно говорить в Present Simple: «I know the correct database password right now.»"
      }
    }
  ]
};