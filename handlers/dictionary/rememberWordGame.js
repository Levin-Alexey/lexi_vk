import { editVkMessage, sendVkMessage } from '../../services/vkApi.js';
import { calculateNextReview } from './spacedRepetition.js';

const PAYLOAD_VERSION = 1;
const LEXI_DICTIONARY_COMMAND = 'lexi_dictionary';
const DICTIONARY_GAME_COMMAND = 'dictionary_game';
const START_DICTIONARY_TRAINING_COMMAND = 'dictionary_train_start';
const SHOW_TRAIN_ANSWER_COMMAND = 'show_train_ans';
const RATE_WORD_COMMAND = 'rate_word';
const TRAINING_SESSION_PREFIX = 'dict_training_session_';

export function dictionaryGamePayload() {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: DICTIONARY_GAME_COMMAND,
  });
}

export function isDictionaryGameCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === DICTIONARY_GAME_COMMAND;
}

function dictionaryTrainStartPayload() {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: START_DICTIONARY_TRAINING_COMMAND,
  });
}

function showTrainAnswerPayload(wordId) {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: SHOW_TRAIN_ANSWER_COMMAND,
    w: Number(wordId),
  });
}

function rateWordPayload(wordId, quality) {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: RATE_WORD_COMMAND,
    w: Number(wordId),
    q: Number(quality),
  });
}

export function isDictionaryTrainingCommand(payload) {
  if (payload?.v !== PAYLOAD_VERSION) return false;
  return [START_DICTIONARY_TRAINING_COMMAND, SHOW_TRAIN_ANSWER_COMMAND, RATE_WORD_COMMAND].includes(payload?.c);
}

const dictionaryTrainingKeyboard = {
  inline: true,
  buttons: [
    [
      {
        action: {
          type: 'callback',
          label: 'Начать тренировку',
          payload: dictionaryTrainStartPayload(),
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

export async function handleDictionaryGame({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: [
      'Игра на память 🧠🎮',
      '',
      'Lexi подготовила для Вас умную тренировку слов.',
      'Здесь каждое слово появляется в нужный момент: не слишком рано и не слишком поздно - именно тогда, когда его важно повторить.',
      '',
      'Если Вы быстро вспомнили слово, Lexi отложит его на потом.',
      'Если было сложно - покажет раньше.',
      'Если забыли - ничего страшного, слово вернется завтра, и мы закрепим его заново.',
      '',
      'Так Ваш словарь постепенно переходит из “вроде знаю” в “точно помню и могу использовать”.',
      '',
      'Начните тренировку и проверьте свою память!',
    ].join('\n'),
    keyboard: dictionaryTrainingKeyboard,
  });
}

export async function handleDictionaryTrainingAction({ env, userId, groupId, token, payload, eventContext }) {
  if (!env?.DB) {
    return { ok: false, snackbarText: 'База данных временно недоступна.' };
  }

  await ensureTrainingSchema(env.DB);

  if (payload?.c === START_DICTIONARY_TRAINING_COMMAND) {
    await setTrainingSessionStats(env, userId, {
      startedAt: new Date().toISOString(),
      reviewedWords: 0,
      forgotWords: 0,
      qualitySum: 0,
      qualityCount: 0,
    });
    return startTrainingSession(env, userId, groupId, token, { fromRating: false });
  }

  if (payload?.c === SHOW_TRAIN_ANSWER_COMMAND) {
    const wordId = Number(payload?.w);
    if (!wordId) {
      return { ok: false, snackbarText: 'Не удалось определить слово.' };
    }

    const wordRow = await env.DB
      .prepare(`
        SELECT bw.word_en, bw.translation_ru, bw.example_en
        FROM user_dictionary ud
        JOIN base_words bw ON bw.id = ud.word_id
        WHERE ud.vk_id = ? AND ud.word_id = ?
        LIMIT 1
      `)
      .bind(userId, wordId)
      .first();

    if (!wordRow) {
      return { ok: false, snackbarText: 'Слово не найдено в тренировке.' };
    }

    const updatedText = [
      `🇬🇧 Слово: ${wordRow.word_en}`,
      `🇷🇺 Перевод: ${wordRow.translation_ru || 'перевод пока готовится'}`,
      `📖 Пример: ${wordRow.example_en || 'пример пока готовится'}`,
      '',
      'Оцени, как хорошо ты помнил это слово?',
    ].join('\n');

    const keyboard = {
      inline: true,
      buttons: [
        [
          { action: { type: 'callback', label: 'Забыл 🔴', payload: rateWordPayload(wordId, 1) }, color: 'negative' },
          { action: { type: 'callback', label: 'С трудом 🟡', payload: rateWordPayload(wordId, 3) }, color: 'secondary' },
        ],
        [
          { action: { type: 'callback', label: 'Помню 🟢', payload: rateWordPayload(wordId, 4) }, color: 'primary' },
          { action: { type: 'callback', label: 'Легко 🔵', payload: rateWordPayload(wordId, 5) }, color: 'positive' },
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

    const editResult = await editVkMessage({
      token,
      peerId: eventContext?.peerId,
      conversationMessageId: eventContext?.conversationMessageId,
      message: updatedText,
      keyboard,
    });

    if (!editResult?.ok) {
      return { ok: false, snackbarText: 'Не удалось открыть ответ.' };
    }

    return { ok: true, snackbarText: 'Ответ открыт.' };
  }

  if (payload?.c === RATE_WORD_COMMAND) {
    const wordId = Number(payload?.w);
    const quality = Number(payload?.q);

    if (!wordId || ![1, 3, 4, 5].includes(quality)) {
      return { ok: false, snackbarText: 'Некорректная оценка.' };
    }

    const statRow = await env.DB
      .prepare('SELECT repetition, interval_days, easiness_factor FROM user_dictionary WHERE vk_id = ? AND word_id = ? LIMIT 1')
      .bind(userId, wordId)
      .first();

    if (!statRow) {
      return { ok: false, snackbarText: 'Не нашла статистику слова.' };
    }

    const nextStats = calculateNextReview(
      quality,
      Number(statRow?.repetition || 0),
      Number(statRow?.easiness_factor || 2.5),
      Number(statRow?.interval_days || 0),
    );

    await env.DB
      .prepare(`
        UPDATE user_dictionary
        SET repetition = ?, interval_days = ?, easiness_factor = ?, next_review_at = ?
        WHERE vk_id = ? AND word_id = ?
      `)
      .bind(nextStats.repetition, nextStats.interval_days, nextStats.easiness_factor, nextStats.next_review_at, userId, wordId)
      .run();

    await incrementTrainingStats(env, userId, quality);
    await startTrainingSession(env, userId, groupId, token, { fromRating: true });
    return { ok: true, snackbarText: 'Сохранила оценку.' };
  }

  return { ok: false };
}

async function startTrainingSession(env, userId, groupId, vkToken, options = {}) {
  const { fromRating = false } = options;
  const now = new Date().toISOString();

  const dueWord = await env.DB
    .prepare(`
      SELECT ud.word_id, bw.word_en
      FROM user_dictionary ud
      JOIN base_words bw ON ud.word_id = bw.id
      WHERE ud.vk_id = ?
        AND (ud.next_review_at IS NULL OR ud.next_review_at <= ?)
      ORDER BY ud.next_review_at ASC, ud.added_at ASC, ud.word_id ASC
      LIMIT 1
    `)
    .bind(userId, now)
    .first();

  if (!dueWord) {
    if (fromRating) {
      const stats = await getTrainingSessionStats(env, userId);
      const reviewedWords = Number(stats?.reviewedWords || 0);
      const forgotWords = Number(stats?.forgotWords || 0);
      const qualityCount = Number(stats?.qualityCount || 0);
      const qualitySum = Number(stats?.qualitySum || 0);
      const avgQuality = qualityCount > 0 ? (qualitySum / qualityCount).toFixed(2) : '0.00';

      await sendVkMessage({
        userId,
        groupId,
        token: vkToken,
        message: [
          '✅ Сессия завершена!',
          '',
          `📚 Слов пройдено: ${reviewedWords}`,
          `🔴 Слов забыто: ${forgotWords}`,
          `⭐ Средняя оценка: ${avgQuality}`,
          '',
          'Отличная работа! Возвращайся позже для новой тренировки.',
        ].join('\n'),
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

      await clearTrainingSessionStats(env, userId);
      return { ok: true, snackbarText: 'Сессия завершена.' };
    }

    await sendVkMessage({
      userId,
      groupId,
      token: vkToken,
      message: '🎉 На сегодня нет слов для повторения! Ты молодец!',
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
    return { ok: true, snackbarText: 'Новых слов для повторения пока нет.' };
  }

  const message = `🧠 Тренировка\n\nКак переводится слово: ${dueWord.word_en}?`;
  const keyboard = {
    inline: true,
    buttons: [
      [
        {
          action: {
            type: 'callback',
            label: 'Показать ответ 👀',
            payload: showTrainAnswerPayload(dueWord.word_id),
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

  await sendVkMessage({ userId, groupId, token: vkToken, message, keyboard });
  return { ok: true };
}

async function ensureTrainingSchema(db) {
  await addColumnIfMissing(db, 'user_dictionary', 'repetition', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing(db, 'user_dictionary', 'interval_days', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing(db, 'user_dictionary', 'easiness_factor', 'REAL NOT NULL DEFAULT 2.5');
  await addColumnIfMissing(db, 'user_dictionary', 'next_review_at', 'TEXT');
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_user_dictionary_review ON user_dictionary(vk_id, next_review_at)').run();
}

async function addColumnIfMissing(db, tableName, columnName, sqlType) {
  const info = await db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = (info.results || []).some((column) => column.name === columnName);
  if (exists) return;
  await db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${sqlType}`).run();
}

function getTrainingSessionKey(userId) {
  return `${TRAINING_SESSION_PREFIX}${userId}`;
}

async function getTrainingSessionStats(env, userId) {
  if (!env?.KV) return null;
  const raw = await env.KV.get(getTrainingSessionKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function setTrainingSessionStats(env, userId, stats) {
  if (!env?.KV) return;
  await env.KV.put(getTrainingSessionKey(userId), JSON.stringify(stats));
}

async function clearTrainingSessionStats(env, userId) {
  if (!env?.KV) return;
  await env.KV.delete(getTrainingSessionKey(userId));
}

async function incrementTrainingStats(env, userId, quality) {
  const current = (await getTrainingSessionStats(env, userId)) || {
    startedAt: new Date().toISOString(),
    reviewedWords: 0,
    forgotWords: 0,
    qualitySum: 0,
    qualityCount: 0,
  };

  current.reviewedWords = Number(current.reviewedWords || 0) + 1;
  if (Number(quality) <= 1) {
    current.forgotWords = Number(current.forgotWords || 0) + 1;
  }
  current.qualitySum = Number(current.qualitySum || 0) + Number(quality || 0);
  current.qualityCount = Number(current.qualityCount || 0) + 1;

  await setTrainingSessionStats(env, userId, current);
}