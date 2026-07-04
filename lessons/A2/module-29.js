export const A2_LESSON_29 = {
  id: 59,
  level_id: 2,
  order_num: 29,
  title: "Простые связки: because, but, so, and",
  description: "Научитесь объединять простые предложения в сложные логические цепочки, аргументировать технические решения и объяснять причинно-следственные связи без ломаного синтаксиса.",
  is_premium: 0,
  steps: [
    {
      order_num: 1,
      step_type: "theory",
      content: {
        text: `🎬 СИНТАКСИЧЕСКИЙ КЛЕЙ С LEXI: СТРОИМ СЛОЖНЫЕ МЫСЛИ

Привет! На связи Lexi. Мы уже освоили огромный массив грамматики: от прошедшего времени до тонкостей планирования будущего. Но до сих пор наши фразы часто выглядели как отдельные изолированные команды в коде. В живой речи и деловой переписке важно уметь склеивать простые мысли в красивые, логичные и развернутые предложения.

Сегодня мы разберем четыре главных союза-соединителя (Linkers): AND, BUT, BECAUSE и SO. Это базовый «инженерный клей» английского языка. С его помощью вы сможете не просто констатировать факты, а выстраивать причинно-следственные связи, противопоставлять аргументы и объяснять клиентам логику работы ваших скриптов.

Включайте видео! Мы разберем синтаксические правила расстановки этих связок и настроим вашу речь на плавное, естественное звучание.`,
        video_url: "https://vk.com/video-230370533_456239085",
        vk_attachment: "video-230370533_456239085",
        button_text: "К матрице логических связок ➡️"
      }
    },
    {
      order_num: 2,
      step_type: "theory",
      content: {
        text: `✨ УРОК 29. МАТРИЦА СВЯЗОК И ПРАВИЛА ПУНКТУАЦИИ

Каждая из четырех связок выполняет свою строгую логическую задачу в архитектуре предложения.

1. AND [энд] — И (Добавление информации)
Используется, когда мы просто перечисляем однородные факты или действия.
• Пример: We optimized the prompt structure and we updated the database variables. (Мы оптимизировали структуру промпта и обновили переменные базы данных).

2. BUT [бат] — НО (Контраст и противопоставление)
Помогает показать ограничение, проблему или неожиданный поворот.
⚠️ ПРАВИЛО ЗАПЯТОЙ: Перед союзом BUT в сложных предложениях всегда ставится запятая!
• Пример: The userbot-parser is very fast, but it requires stable proxy parameters. (Юзербот-парсер очень быстрый, но он требует стабильных параметров прокси).

3. BECAUSE [бикóз] — ПОТОМУ ЧТО (Причина)
Отвечает на вопрос «Почему это произошло?» и вводит первопричину события.
• Пример: The automated script stopped because the API token expired. (Автоматизированный скрипт остановился, потому что истек срок действия API-токена).

4. SO [соу] — ПОЭТОМУ / ИТАК (Следствие и результат)
Показывает финальный результат или действие, которое вытекает из предыдущего факта. Перед SO часто ставится запятая.
• Пример: The Ozon server was slow, so we changed our connection cloud parameters. (Сервер Ozon работал медленно, поэтому мы изменили параметры подключения к облаку).

🔥 ГЛАВНЫЙ СЕКРЕТ УРОВНЯ А2: ЗЕРКАЛО BECAUSE И SO
Слова because и so — это логические зеркала друг друга. Ты можешь пересобрать одно и то же ТЗ, просто поменяв их местами:
• Вариант с Because: We moved the backend to Go because Python was slow for streaming. (Мы перенесли бэкенд на Go, потому что Python работал медленно для стриминга).
• Вариант с So: Python was slow for streaming, so we moved the backend to Go. (Python работал медленно для стриминга, поэтому мы перенесли бэкенд на Go).`,
        button_text: "Посмотреть живой пример ➡️"
      }
    },
    {
      order_num: 3,
      step_type: "theory",
      content: {
        text: `📖 ЖИВОЙ МИКРО-ДИАЛОГ: АНАЛИЗ ЛОГОВ И НАСТРОЙКА ЛИДГЕНЕРАЦИИ

Давай послушаем, как основатель ИТ-студии Алекс и менеджер Марина обсуждают оптимизацию нового ИИ-инструмента для сбора заявок в Telegram и ВК, используя наши логические связки:

Marina: Alex, I am looking at our new lead generation system logs. The userbot-parser is working, but it isn't collecting keywords from the VK groups.
Alex: I see. It is not collecting data because the target community changed its privacy settings yesterday.
Marina: Oh, understand. So we need to update our parser request parameters, right?
Alex: Exactly. We should modify the raw connection string and we must check the cloud proxy status. 
Marina: No problem. Our lead developer is free tonight, so he can fix this bug easily. 
Alex: Perfect! I'll send him the new API documentation because he needs the correct methods for the update.

🇷🇺 ПЕРЕВОД ДЛЯ ПРОВЕРКИ:

Марина: Алекс, я смотрю на логи нашей новой системы лидогенерации. Юзербот-парсер работает, но он не собирает ключевые слова из групп ВК. (working, but it isn't... — контраст через BUT с запятой).
Алекс: Понятно. Он не собирает данные, потому что целевое сообщество вчера изменило свои настройки приватности. (not collecting... because... — указание причины).
Марина: О, понимаю. Поэтом нам нужно обновить параметры запроса нашего парсера, верно? (So we need... — результат/следствие).
Алекс: Именно. Нам следует изменить необработанную строку подключения, и мы обязаны проверить статус прокси в облаке. (...and we must check — добавление информации через AND).
Марина: Без проблем. Наш ведущий разработчик сегодня вечером свободен, поэтому он может легко исправить этот баг. (...tonight, so he can fix... — следствие).
Алекс: Идеально! Я отправлю ему новую документацию API, потому что ему нужны правильные методы для этого обновления. (...because he needs... — причина).

💡 А2 ПРО-ЛАЙФХАК ДЛЯ ДЕЛОВОЙ ПЕРЕПИСКИ:
Когда ты пишешь отчет клиенту об успешном решении проблемы, связка SO делает твой текст уверенным и ориентированным на результат. Напиши: "We optimized the script, so your Wildberries metrics are completely safe now" (Мы оптимизировали скрипт, поэтому ваши метрики Wildberries теперь в полной безопасности). Это звучит солидно и экспертно.

🔥 Твое мини-задание: Соедини два факта о своем сегодняшнем дне. Произнеси вслух четко и слитно фразу: "I study English because I want to scale my business." Почувствуй логику этого предложения!`,
        button_text: "Перейти к тестам ➡️"
      }
    },
    {
      order_num: 4,
      step_type: "quiz_choice",
      content: {
        question: "Вам нужно написать отчет для Марины в Slack: «Наш сервер баз данных D1 упал, поэтому автоматический бот перестал отправлять метрики продавцам Ozon». Какую связку следствия нужно использовать?",
        options: [
          { id: "a", text: "Our D1 database server crashed, because the automated bot stopped sending metrics.", is_correct: false },
          { id: "b", text: "Our D1 database server crashed, so the automated bot stopped sending metrics.", is_correct: true },
          { id: "c", text: "Our D1 database server crashed, but the automated bot stopped sending metrics.", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ — вариант B. Союз «so» переводится как «поэтому» и вводит результат или следствие произошедшего события. Вариант А ломает логику (сервер упал, потому что бот остановился), а вариант C использует неподходящий союз контраста «но»."
      }
    },
    {
      order_num: 5,
      step_type: "quiz_choice",
      content: {
        question: "Вы описываете клиенту статус разработки новой ИИ-школы: «Мы перенесли всю инфраструктуру на платформу ВК, но нам все еще нужно настроить финальные параметры промптов». Выберите верный вариант с точки зрения пунктуации уровня А2:",
        options: [
          { id: "a", text: "We migrated the full infrastructure to the VK platform, but we still need to configure the final prompt parameters.", is_correct: true },
          { id: "b", text: "We migrated the full infrastructure to the VK platform but, we still need to configure the final prompt parameters.", is_correct: false },
          { id: "c", text: "We migrated the full infrastructure to the VK platform because we still need to configure the final prompt parameters.", is_correct: false }
        ],
        explanation_if_wrong:
          "Правильный ответ — вариант А. Союз «but» (но) используется для противопоставления, и запятая в сложных предложениях ставится строго ПЕРЕД ним. Вариант C ошибочен, так как союз «because» нарушает логический смысл предложения."
      }
    },
    {
      order_num: 6,
      step_type: "quiz_choice",
      content: {
        question: "Проверьте логику предложения и выберите пропущенное слово: «Our lead developer wants to learn the Go programming language ______ he needs to build high-performance microservices for audio streaming».",
        options: [
          { id: "a", text: "but", is_correct: false },
          { id: "b", text: "so", is_correct: false },
          { id: "c", text: "because", is_correct: true }
        ],
        explanation_if_wrong:
          "Правильный ответ — «because». Вторая часть предложения объясняет первопричину (зачем разработчику нужен Go — потому что ему необходимо создавать высокопроизводительные микросервисы), поэтому здесь применим исключительно союз причины."
      }
    }
  ]
};