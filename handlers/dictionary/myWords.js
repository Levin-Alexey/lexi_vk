import { sendVkCarousel, sendVkMessage } from '../../services/vkApi.js';

const PAYLOAD_VERSION = 1;
const MY_DICTIONARY_WORDS_COMMAND = 'dictionary_my_words';
const LEXI_DICTIONARY_COMMAND = 'lexi_dictionary';
const OPEN_MY_DICTIONARY_WORDS_COMMAND = 'dictionary_my_words_open';
const SHOW_DICT_TRANS_COMMAND = 'show_dict_trans';
const LISTEN_DICT_AUDIO_COMMAND = 'listen_dict_audio';
const DICT_PAGE_COMMAND = 'dict_page';
const PAGE_SIZE = 10;
const DICTIONARY_CARD_LINK = 'https://vk.com';

export function myDictionaryWordsPayload() {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: MY_DICTIONARY_WORDS_COMMAND,
  });
}

export function isMyDictionaryWordsCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === MY_DICTIONARY_WORDS_COMMAND;
}

export function myDictionaryWordsOpenPayload(offset = 0) {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: OPEN_MY_DICTIONARY_WORDS_COMMAND,
    o: Number(offset) || 0,
  });
}

function dictShowTranslationPayload(wordId) {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: SHOW_DICT_TRANS_COMMAND,
    d: Number(wordId),
  });
}

function dictListenAudioPayload(wordId) {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: LISTEN_DICT_AUDIO_COMMAND,
    d: Number(wordId),
  });
}

function dictPagePayload(offset) {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: DICT_PAGE_COMMAND,
    o: Math.max(0, Number(offset) || 0),
  });
}

export function isDictionaryCarouselCommand(payload) {
  if (payload?.v !== PAYLOAD_VERSION) return false;
  return [OPEN_MY_DICTIONARY_WORDS_COMMAND, SHOW_DICT_TRANS_COMMAND, LISTEN_DICT_AUDIO_COMMAND, DICT_PAGE_COMMAND].includes(payload?.c);
}

const myWordsSectionKeyboard = {
  inline: true,
  buttons: [
    [
      {
        action: {
          type: 'callback',
          label: 'Мои слова',
          payload: myDictionaryWordsOpenPayload(0),
        },
        color: 'primary',
      },
    ],
    [
      {
        action: {
          type: 'callback',
          label: 'Назад',
          payload: JSON.stringify({ v: PAYLOAD_VERSION, c: LEXI_DICTIONARY_COMMAND }),
        },
        color: 'secondary',
      },
    ],
  ],
};

export async function handleMyDictionaryWords({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: [
      'Ваш личный словарь уже ждет Вас 📚✨',
      '',
      'Здесь Lexi собрала слова, которые Вы изучаете. Каждое слово - это отдельная карточка с переводом и аудио произношением, чтобы Вы могли не только запомнить значение, но и услышать, как слово звучит в живой речи.',
      '',
      'Листайте карточки, слушайте произношение, повторяйте за Lexi и постепенно превращайте новые слова в активный словарный запас.',
      '',
      'Откройте карточки и повторите несколько слов уже сейчас.',
    ].join('\n'),
    keyboard: myWordsSectionKeyboard,
  });
}

export async function handleDictionaryCarouselAction({ env, userId, groupId, token, payload }) {
  if (!env?.DB) {
    return { ok: false, snackbarText: 'База данных временно недоступна.' };
  }

  await ensureMyWordsSchema(env.DB);

  if (payload?.c === OPEN_MY_DICTIONARY_WORDS_COMMAND || payload?.c === DICT_PAGE_COMMAND) {
    const offset = Math.max(0, Number(payload?.o) || 0);
    await sendUserDictionaryCarousel({ env, userId, groupId, vkToken: token, offset });
    return { ok: true };
  }

  const wordId = Number(payload?.d);
  if (!wordId) {
    return { ok: false, snackbarText: 'Не удалось определить слово.' };
  }

  const wordRow = await env.DB
    .prepare(`
      SELECT bw.id, bw.word_en, bw.translation_ru, bw.example_en, bw.audio_url
      FROM user_dictionary ud
      JOIN base_words bw ON bw.id = ud.word_id
      WHERE ud.vk_id = ? AND bw.id = ?
      LIMIT 1
    `)
    .bind(userId, wordId)
    .first();

  if (!wordRow) {
    return { ok: false, snackbarText: 'Слово не найдено в Вашем словаре.' };
  }

  if (payload?.c === SHOW_DICT_TRANS_COMMAND) {
    await sendVkMessage({
      userId,
      groupId,
      token,
      message: [
        `🇬🇧 ${wordRow.word_en}`,
        `🇷🇺 Перевод: ${wordRow.translation_ru || 'перевод пока готовится'}`,
      ].join('\n'),
    });
    return { ok: true };
  }

  if (payload?.c === LISTEN_DICT_AUDIO_COMMAND) {
      if (!env?.DICTIONARY_TASKS) {
        return { ok: false, snackbarText: 'Очередь словаря не подключена.' };
      }

      await env.DICTIONARY_TASKS.send({
        type: 'deliver_word_audio',
        wordId,
        userId,
        groupId,
      });

      return { ok: true, snackbarText: 'Готовлю аудио, сейчас отправлю в чат.' };
  }

  return { ok: false };
}

async function sendUserDictionaryCarousel({ env, userId, groupId, vkToken, offset = 0 }) {
  await ensureMyWordsSchema(env.DB);

  const normalizedOffset = Math.max(0, Number(offset) || 0);

  const wordsResult = await env.DB
    .prepare(`
      SELECT bw.id, bw.word_en, bw.translation_ru, bw.example_en, bw.audio_url
      FROM user_dictionary ud
      JOIN base_words bw ON ud.word_id = bw.id
      WHERE ud.vk_id = ?
      ORDER BY ud.added_at DESC, ud.word_id DESC
      LIMIT ? OFFSET ?
    `)
    .bind(userId, PAGE_SIZE, normalizedOffset)
    .all();

  const words = wordsResult.results || [];
  if (words.length === 0) {
    await sendVkMessage({
      userId,
      groupId,
      token: vkToken,
      message: 'Твой словарь пока пуст. Добавь новые слова во время уроков.',
    });
    return;
  }

  const totalRow = await env.DB
    .prepare('SELECT COUNT(*) AS total FROM user_dictionary WHERE vk_id = ?')
    .bind(userId)
    .first();
  const total = Number(totalRow?.total || 0);

  const elements = words.map((word) => ({
    title: String(word.word_en || '').slice(0, 80),
    description: String(word.example_en || 'Пример скоро появится...').slice(0, 160),
    action: { type: 'open_link', link: DICTIONARY_CARD_LINK },
    buttons: [
      {
        action: {
          type: 'callback',
          label: 'Показать перевод',
          payload: dictShowTranslationPayload(word.id),
        },
        color: 'primary',
      },
      {
        action: {
          type: 'callback',
          label: 'Послушать',
          payload: dictListenAudioPayload(word.id),
        },
        color: 'secondary',
      },
    ],
  }));

  const carouselResult = await sendVkCarousel({ userId, groupId, token: vkToken, elements });
  if (!carouselResult?.ok) {
    await sendVkMessage({
      userId,
      groupId,
      token: vkToken,
      message: 'Не удалось открыть карточки слов. Попробуй еще раз через пару секунд.',
    });
    return;
  }

  const pageButtons = [];
  const prevOffset = Math.max(0, normalizedOffset - PAGE_SIZE);
  const nextOffset = normalizedOffset + PAGE_SIZE;

  if (normalizedOffset > 0) {
    pageButtons.push({
      action: { type: 'callback', label: '⬅️ Назад', payload: dictPagePayload(prevOffset) },
      color: 'secondary',
    });
  }

  if (nextOffset < total) {
    pageButtons.push({
      action: { type: 'callback', label: '➡️ Дальше', payload: dictPagePayload(nextOffset) },
      color: 'secondary',
    });
  }

  if (pageButtons.length > 0) {
    await sendVkMessage({
      userId,
      groupId,
      token: vkToken,
      message: `Листай карточки. Страница ${Math.floor(normalizedOffset / PAGE_SIZE) + 1}.`,
      keyboard: {
        inline: true,
        buttons: [
          pageButtons,
          [
            {
              action: {
                type: 'callback',
                label: 'Назад',
                payload: JSON.stringify({ v: PAYLOAD_VERSION, c: LEXI_DICTIONARY_COMMAND }),
              },
              color: 'secondary',
            },
          ],
        ],
      },
    });
    return;
  }

  await sendVkMessage({
    userId,
    groupId,
    token: vkToken,
    message: `Карточки загружены. Страница ${Math.floor(normalizedOffset / PAGE_SIZE) + 1}.`,
    keyboard: {
      inline: true,
      buttons: [
        [
          {
            action: {
              type: 'callback',
              label: 'Назад',
              payload: JSON.stringify({ v: PAYLOAD_VERSION, c: LEXI_DICTIONARY_COMMAND }),
            },
            color: 'secondary',
          },
        ],
      ],
    },
  });
}

function truncateForSnackbar(text) {
  const normalized = String(text || '').trim();
  if (normalized.length <= 90) {
    return normalized;
  }
  return `${normalized.slice(0, 87)}...`;
}

async function ensureMyWordsSchema(db) {
  if (!db) return;

  await addColumnIfMissing(db, 'user_dictionary', 'added_at', 'TEXT');
  await db
    .prepare("UPDATE user_dictionary SET added_at = COALESCE(added_at, CURRENT_TIMESTAMP)")
    .run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_user_dictionary_added_at ON user_dictionary(vk_id, added_at)').run();
}

async function addColumnIfMissing(db, tableName, columnName, sqlType) {
  const info = await db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = (info.results || []).some((column) => column.name === columnName);
  if (exists) return;

  await db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${sqlType}`).run();
}
