import { sendVkMessage, sendVkVoiceMessageFromMp3 } from './vkApi.js';

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'deepseek/deepseek-chat';
const OPENAI_AUDIO_SPEECH_URL = 'https://api.openai.com/v1/audio/speech';
const OPENAI_TTS_MODEL = 'tts-1';
const OPENAI_TTS_VOICE = 'nova';
const DEFAULT_R2_PUBLIC_BASE_URL = 'https://pub-3c07f333ebcc4cb69dc369beb8d7086a.r2.dev';

export async function handleAddWordCommand(env, userId, groupId, vkToken) {
  if (!env?.DB) {
    return sendVkMessage({ userId, groupId, token: vkToken, message: 'База данных временно недоступна.' });
  }

  await ensureDictionarySchema(env.DB);
  await env.DB.prepare('INSERT OR IGNORE INTO users_vk (vk_id) VALUES (?)').bind(userId).run();

  let nextWord = null;
  let insertedWord = false;

  // Protect against concurrent clicks: reserve the selected word first, retry on conflicts.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = await env.DB
      .prepare(`
        SELECT id, word_en, "rank", translation_ru, example_en, audio_url
        FROM base_words
        WHERE "rank" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM user_dictionary ud
            WHERE ud.vk_id = ?
              AND ud.word_id = base_words.id
          )
        ORDER BY "rank" ASC, id ASC
        LIMIT 1
      `)
      .bind(userId)
      .first();

    if (!candidate) {
      break;
    }

    const insertResult = await env.DB
      .prepare('INSERT OR IGNORE INTO user_dictionary (vk_id, word_id) VALUES (?, ?)')
      .bind(userId, candidate.id)
      .run();

    if (Number(insertResult?.meta?.changes || 0) > 0) {
      nextWord = candidate;
      insertedWord = true;
      break;
    }
  }

  if (!nextWord) {
    return sendVkMessage({
      userId,
      groupId,
      token: vkToken,
      message: '🎉 Ты добавил все слова из базы. Твой словарь уже полный.',
    });
  }

  if (!insertedWord) {
    return { ok: false, reason: 'dictionary_insert_conflict' };
  }

  await env.DB
    .prepare('UPDATE users_vk SET current_word_rank = ?, current_word_id = ? WHERE vk_id = ?')
    .bind(Number(nextWord.rank) || 0, Number(nextWord.id) || 0, userId)
    .run();

  if (hasCachedWordAssets(nextWord)) {
    return sendWordCardToVK({ userId, groupId, token: vkToken, wordData: nextWord });
  }

  await sendVkMessage({
    userId,
    groupId,
    token: vkToken,
    message: `⏳ Добавляю слово ${nextWord.word_en}...\nГенерирую перевод и аудио-пример. Это займет пару секунд.`,
  });

  const queuePayload = {
    type: 'generate_word_data',
    wordId: Number(nextWord.id),
    userId,
    groupId,
  };

  if (env?.DICTIONARY_TASKS) {
    await env.DICTIONARY_TASKS.send(queuePayload);
    return { ok: true, queued: true };
  }

  // Fallback for environments where dictionary queue is not enabled yet.
  return processDictionaryQueueMessage(queuePayload, env);
}

export async function processDictionaryQueueMessage(body, env) {
  const { type, wordId, userId, groupId } = body || {};
  if (type !== 'generate_word_data' || !wordId) {
    return { ok: false, reason: 'unsupported_dictionary_task' };
  }

  try {
    await ensureDictionarySchema(env.DB);

    const wordRow = await env.DB
      .prepare('SELECT id, word_en, "rank", translation_ru, example_en, audio_url FROM base_words WHERE id = ? LIMIT 1')
      .bind(wordId)
      .first();

    if (!wordRow?.word_en) {
      return { ok: false, reason: 'word_not_found' };
    }

    if (hasCachedWordAssets(wordRow)) {
      await sendWordCardToVK({ userId, groupId, token: env.VK_TOKEN, wordData: wordRow });
      return { ok: true, cacheHit: true };
    }

    const generated = await generateWordData(env.OPENROUTER_API_KEY, wordRow.word_en);
    const audio = await synthesizeAudio(env.OPENAI_API_KEY, generated.example_en);

    let audioUrl = '';
    if (audio && env?.MY_R2_BUCKET) {
      const key = `words/example_${wordRow.id}.mp3`;
      await env.MY_R2_BUCKET.put(key, audio.buffer, {
        httpMetadata: { contentType: 'audio/mpeg' },
      });
      const baseUrl = String(env.R2_PUBLIC_BASE_URL || DEFAULT_R2_PUBLIC_BASE_URL).replace(/\/+$/, '');
      audioUrl = `${baseUrl}/${key}`;
    }

    await env.DB
      .prepare('UPDATE base_words SET translation_ru = ?, example_en = ?, audio_url = ? WHERE id = ?')
      .bind(generated.translation_ru, generated.example_en, audioUrl, wordRow.id)
      .run();

    const completeWordData = {
      ...wordRow,
      translation_ru: generated.translation_ru,
      example_en: generated.example_en,
      audio_url: audioUrl,
    };

    await sendWordCardToVK({ userId, groupId, token: env.VK_TOKEN, wordData: completeWordData });
    return { ok: true };
  } catch (error) {
    console.error('[DICT_ERROR] processDictionaryQueueMessage failed', error);
    if (userId && groupId && env?.VK_TOKEN) {
      await sendVkMessage({
        userId,
        groupId,
        token: env.VK_TOKEN,
        message: '❌ Не удалось подготовить слово. Попробуй еще раз чуть позже.',
      });
    }
    return { ok: false, reason: 'dictionary_generation_failed' };
  }
}

export async function sendWordCardToVK({ userId, groupId, token, wordData }) {
  const message = [
    `📚 Новое слово: ${wordData.word_en}`,
    `🇷🇺 Перевод: ${wordData.translation_ru || '—'}`,
    '📖 Пример использования:',
    `${wordData.example_en || '—'}`,
  ].join('\n');

  if (wordData.audio_url) {
    try {
      const audioResponse = await fetch(wordData.audio_url);
      if (audioResponse.ok) {
        const audioBuffer = await audioResponse.arrayBuffer();
        const voiceSendResult = await sendVkVoiceMessageFromMp3({
          userId,
          groupId,
          token,
          mp3Bytes: new Uint8Array(audioBuffer),
          mimeType: 'audio/mpeg',
          fileName: `word_${wordData.id || 'example'}.mp3`,
          message,
        });

        if (voiceSendResult?.ok) {
          return voiceSendResult;
        }
      }
    } catch (error) {
      console.error('[DICT_ERROR] sendWordCardToVK audio fallback', error);
    }
  }

  return sendVkMessage({ userId, groupId, token, message });
}

async function generateWordData(apiKey, wordEn) {
  if (!apiKey) {
    return {
      translation_ru: '',
      example_en: `I use the word ${wordEn} in a sentence.`,
    };
  }

  const prompt = `Generate a strict JSON object for the English word "${wordEn}".\nFormat:\n{"ru":"Russian translation","example":"One simple A2-B1 sentence with this word."}`;

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status} ${raw}`);
  }

  const parsedApi = JSON.parse(raw);
  const content = String(parsedApi?.choices?.[0]?.message?.content || '{}');
  const parsedWord = JSON.parse(content);

  return {
    translation_ru: String(parsedWord?.ru || '').trim(),
    example_en: String(parsedWord?.example || '').trim(),
  };
}

async function synthesizeAudio(apiKey, text) {
  if (!apiKey || !text) {
    return null;
  }

  const response = await fetch(OPENAI_AUDIO_SPEECH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_TTS_MODEL,
      voice: OPENAI_TTS_VOICE,
      input: text,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    console.error('[DICT_ERROR] OpenAI TTS failed', response.status, raw);
    return null;
  }

  return { buffer: await response.arrayBuffer() };
}

function hasCachedWordAssets(wordRow) {
  return Boolean(wordRow?.translation_ru && wordRow?.example_en && wordRow?.audio_url);
}

async function ensureDictionarySchema(db) {
  if (!db) return;

  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS user_dictionary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vk_id BIGINT NOT NULL,
        word_id INTEGER NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(vk_id, word_id),
        FOREIGN KEY (vk_id) REFERENCES users_vk(vk_id),
        FOREIGN KEY (word_id) REFERENCES base_words(id)
      )
    `)
    .run();

  await db.prepare('CREATE INDEX IF NOT EXISTS idx_base_words_rank ON base_words("rank")').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_base_words_rank_id ON base_words("rank", id)').run();

  await addColumnIfMissing(db, 'users_vk', 'current_word_rank', 'INTEGER DEFAULT 0');
  await addColumnIfMissing(db, 'users_vk', 'current_word_id', 'INTEGER DEFAULT 0');
  await addColumnIfMissing(db, 'base_words', 'translation_ru', 'TEXT');
  await addColumnIfMissing(db, 'base_words', 'example_en', 'TEXT');
  await addColumnIfMissing(db, 'base_words', 'audio_url', 'TEXT');
}

async function addColumnIfMissing(db, tableName, columnName, sqlType) {
  const info = await db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = (info.results || []).some((column) => column.name === columnName);
  if (exists) return;

  await db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${sqlType}`).run();
}
