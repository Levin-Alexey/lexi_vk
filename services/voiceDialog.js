import { answerVkMessageEvent, editVkMessage, sendVkMessage, sendVkVoiceMessageFromMp3, setVkTypingActivity } from './vkApi.js';

const PAYLOAD_VERSION = 1;
const VOICE_REVEAL_EN_COMMAND = 'voice_show_en';
const VOICE_REVEAL_RU_COMMAND = 'voice_show_ru';
const VOICE_DIALOG_STATE_PREFIX = 'dialog_mode_';
const VOICE_DIALOG_STATE = 'voice_dialog';
const VOICE_MAX_DURATION_SECONDS = 45;

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_TRANSCRIBE_URL = 'https://openrouter.ai/api/v1/audio/transcriptions';
const OPENROUTER_REPLY_MODEL = 'deepseek/deepseek-v4-pro';
const OPENROUTER_VALIDATION_MODEL = 'openai/gpt-4o-mini';
const OPENROUTER_TRANSCRIBE_MODEL = 'openai/whisper-large-v3-turbo';
const OPENROUTER_AUDIO_MODEL = 'openai/gpt-audio';
const TRANSCRIBE_MAX_RETRIES = 3;
const TRANSCRIBE_RETRY_BASE_DELAY_MS = 700;
const HISTORY_WINDOW_SIZE = 12;
const HISTORY_COMPRESS_THRESHOLD = 16;
const HISTORY_RETAIN_COUNT = 6;

export async function activateVoiceDialog(env, userId) {
  if (!env?.KV) {
    return;
  }

  await env.KV.put(`${VOICE_DIALOG_STATE_PREFIX}${userId}`, VOICE_DIALOG_STATE);
}

export async function deactivateVoiceDialog(env, userId) {
  if (!env?.KV) {
    return;
  }

  const key = `${VOICE_DIALOG_STATE_PREFIX}${userId}`;
  const state = await env.KV.get(key);
  if (state === VOICE_DIALOG_STATE) {
    await env.KV.delete(key);
  }
}

export async function isVoiceDialogActive(env, userId) {
  if (!env?.KV) {
    return false;
  }

  const state = await env.KV.get(`${VOICE_DIALOG_STATE_PREFIX}${userId}`);
  return state === VOICE_DIALOG_STATE;
}

export async function enqueueVoiceDialogMessage({ env, userId, groupId, linkMp3, duration }) {
  const audioUrl = String(linkMp3 || '').trim();
  const durationSec = Number(duration || 0);

  if (!env?.VOICE_TASKS || !audioUrl || !Number.isInteger(userId) || userId <= 0 || !Number.isInteger(groupId) || groupId <= 0) {
    return false;
  }

  await env.VOICE_TASKS.send({
    type: 'voice_dialog_message',
    userId,
    groupId,
    linkMp3: audioUrl,
    duration: Number.isFinite(durationSec) ? durationSec : 0,
    queuedAt: new Date().toISOString(),
  });

  return true;
}

export function isVoiceRevealCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && (payload?.c === VOICE_REVEAL_EN_COMMAND || payload?.c === VOICE_REVEAL_RU_COMMAND);
}

export async function handleVoiceRevealEvent({ env, token, payload, eventContext }) {
  await ensureVoiceTables(env?.DB);

  const historyId = Number(payload?.d);
  const command = String(payload?.c || '');

  if (!Number.isInteger(historyId) || historyId <= 0 || !isVoiceRevealCommand(payload)) {
    await answerEvent(eventContext, token, 'Не удалось открыть текст ответа');
    return { ok: false, reason: 'invalid_payload' };
  }

  const row = await env.DB
    .prepare('SELECT en_text, ru_text, en_shown, ru_shown FROM voice_reply_history WHERE id = ? LIMIT 1')
    .bind(historyId)
    .first();

  if (!row?.en_text || !row?.ru_text) {
    await answerEvent(eventContext, token, 'Ответ не найден');
    return { ok: false, reason: 'history_missing' };
  }

  const nextEnShown = Number(row.en_shown || 0) || command === VOICE_REVEAL_EN_COMMAND ? 1 : 0;
  const nextRuShown = Number(row.ru_shown || 0) || command === VOICE_REVEAL_RU_COMMAND ? 1 : 0;

  const updatedText = buildVoiceRevealText({
    enText: row.en_text,
    ruText: row.ru_text,
    enShown: nextEnShown === 1,
    ruShown: nextRuShown === 1,
  });

  const keyboard = buildVoiceRevealKeyboard(historyId, nextEnShown === 1, nextRuShown === 1);

  const result = await editVkMessage({
    token,
    peerId: eventContext.peerId,
    conversationMessageId: eventContext.conversationMessageId,
    message: updatedText,
    keyboard,
  });

  if (result.ok) {
    await env.DB
      .prepare('UPDATE voice_reply_history SET en_shown = ?, ru_shown = ? WHERE id = ?')
      .bind(nextEnShown, nextRuShown, historyId)
      .run();
  }

  await answerEvent(eventContext, token, result.ok ? 'Текст обновлен' : 'Не удалось показать текст');
  return result;
}

export async function processVoiceQueueMessage(body, env) {
  const userId = Number(body?.userId);
  const groupId = Number(body?.groupId);
  const linkMp3 = String(body?.linkMp3 || '').trim();
  const duration = Number(body?.duration || 0);

  if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(groupId) || groupId <= 0 || !linkMp3) {
    console.warn('[VOICE_DIALOG] Пропуск невалидного задания очереди', JSON.stringify(body));
    return { ok: false, reason: 'invalid_body' };
  }

  if (!env?.VK_TOKEN) {
    console.error('[VOICE_DIALOG] VK_TOKEN не задан');
    return { ok: false, reason: 'missing_vk_token' };
  }

  if (duration > VOICE_MAX_DURATION_SECONDS) {
    await sendVkMessage({
      userId,
      groupId,
      token: env.VK_TOKEN,
      message: [
        'Сообщение получилось длинным 🫶',
        `Пожалуйста, отправь голосовое короче ${VOICE_MAX_DURATION_SECONDS} секунд, чтобы я ответила максимально точно.`,
      ].join('\n'),
    });
    return { ok: false, reason: 'duration_exceeded' };
  }

  if (!env?.OPENROUTER_API_KEY) {
    console.error('[VOICE_DIALOG] OPENROUTER_API_KEY не задан');
    await sendVkMessage({
      userId,
      groupId,
      token: env.VK_TOKEN,
      message: 'Голосовой сервис временно недоступен. Попробуйте немного позже.',
    });
    return { ok: false, reason: 'missing_openrouter_key' };
  }

  await ensureVoiceTables(env.DB);
  await env.DB.prepare('INSERT OR IGNORE INTO users_vk (vk_id) VALUES (?)').bind(userId).run();

  const trackUsage = async (usage) => {
    await trackVoiceTokenUsage(env.DB, userId, usage);
  };

  await sendVkMessage({
    userId,
    groupId,
    token: env.VK_TOKEN,
    message: 'Получила Ваше сообщение, думаю над ответом',
  });

  try {
    const audioArrayBuffer = await downloadAudio(linkMp3);
    if (!audioArrayBuffer) {
      await sendVkMessage({
        userId,
        groupId,
        token: env.VK_TOKEN,
        message: 'Не удалось получить голосовое сообщение. Попробуйте отправить его еще раз.',
      });
      return { ok: false, reason: 'download_failed' };
    }

    const base64Audio = arrayBufferToBase64(audioArrayBuffer);
    const transcription = await transcribeAudio({
      apiKey: env.OPENROUTER_API_KEY,
      base64Audio,
      format: 'mp3',
      siteUrl: env.OPENROUTER_SITE_URL,
      siteTitle: env.OPENROUTER_SITE_TITLE,
      onUsage: trackUsage,
    });
    const transcript = transcription.text;

    if (!transcript) {
      await sendVkMessage({
        userId,
        groupId,
        token: env.VK_TOKEN,
        message: 'Я не смогла распознать голос. Запишите, пожалуйста, сообщение еще раз чуть четче.',
      });
      return { ok: false, reason: 'transcription_empty' };
    }

    await setVkTypingActivity({ token: env.VK_TOKEN, peerId: userId });

    const userLevel = await getUserLevel(env.DB, userId);
    const useMemoryForPrompt = shouldUseMemoryForTranscript(transcript);
    const currentSummary = useMemoryForPrompt ? await getCurrentSummary(env.DB, userId) : '';
    const recentHistory = useMemoryForPrompt ? await getRecentHistory(env.DB, userId, 4) : [];
    const modelMessages = buildVoiceDialogMessages({
      summary: currentSummary,
      historyRows: recentHistory,
      userText: transcript,
      level: userLevel,
    });
    const directReply = buildDirectReplyIfNeeded(transcript, userLevel);

    const reply = directReply || await generateVoiceReply({
      apiKey: env.OPENROUTER_API_KEY,
      modelMessages,
      siteUrl: env.OPENROUTER_SITE_URL,
      siteTitle: env.OPENROUTER_SITE_TITLE,
      onUsage: trackUsage,
    });

    const safeReply = await ensureReplyMatchesLatestMessage({
      reply,
      transcript,
      summary: currentSummary,
      recentHistory,
      level: userLevel,
      apiKey: env.OPENROUTER_API_KEY,
      siteUrl: env.OPENROUTER_SITE_URL,
      siteTitle: env.OPENROUTER_SITE_TITLE,
      onUsage: trackUsage,
    });

    const levelAdjustedEn = await enforceLevelAdaptiveEnglish({
      englishText: safeReply.en,
      level: userLevel,
      transcript,
      apiKey: env.OPENROUTER_API_KEY,
      siteUrl: env.OPENROUTER_SITE_URL,
      siteTitle: env.OPENROUTER_SITE_TITLE,
      onUsage: trackUsage,
    });

    const levelAdjustedReply = {
      ...safeReply,
      en: levelAdjustedEn,
    };

    const normalizedCorrections = normalizeCorrections(levelAdjustedReply.corrections, transcript);
    const validatedCorrections = await gateCorrectionsWithMiniCheck({
      apiKey: env.OPENROUTER_API_KEY,
      transcript,
      corrections: normalizedCorrections,
      siteUrl: env.OPENROUTER_SITE_URL,
      siteTitle: env.OPENROUTER_SITE_TITLE,
      validationModel: env.OPENROUTER_VALIDATION_MODEL || OPENROUTER_VALIDATION_MODEL,
      onUsage: trackUsage,
    });

    let voiceAudio = null;
    try {
      voiceAudio = await synthesizeEnglishAudio({
        apiKey: env.OPENROUTER_API_KEY,
        englishText: levelAdjustedReply.en,
        siteUrl: env.OPENROUTER_SITE_URL,
        siteTitle: env.OPENROUTER_SITE_TITLE,
        onUsage: trackUsage,
      });
    } catch (ttsError) {
      console.error('[VOICE_DIALOG] TTS synthesis failed, fallback to text reply', ttsError);
      voiceAudio = null;
    }

    await env.DB.prepare('INSERT INTO chat_history (vk_id, role, content) VALUES (?, ?, ?)').bind(userId, 'user', transcript).run();

    const spokenEnglishText = await resolveSpokenEnglishText({
      voiceAudio,
      fallbackEnglishText: levelAdjustedReply.en,
      apiKey: env.OPENROUTER_API_KEY,
      siteUrl: env.OPENROUTER_SITE_URL,
      siteTitle: env.OPENROUTER_SITE_TITLE,
      onUsage: trackUsage,
    });
    const russianTextForSpoken = await alignRussianTranslation({
      apiKey: env.OPENROUTER_API_KEY,
      englishText: spokenEnglishText,
      fallbackRussian: levelAdjustedReply.ru,
      siteUrl: env.OPENROUTER_SITE_URL,
      siteTitle: env.OPENROUTER_SITE_TITLE,
      onUsage: trackUsage,
    });

    const assistantTextForMemory = validatedCorrections ? `${spokenEnglishText}\n\n${validatedCorrections}` : spokenEnglishText;
    await env.DB
      .prepare('INSERT INTO chat_history (vk_id, role, content, translation_ru) VALUES (?, ?, ?, ?)')
      .bind(userId, 'assistant', assistantTextForMemory, russianTextForSpoken)
      .run();

    const insertResult = await env.DB
      .prepare('INSERT INTO voice_reply_history (vk_id, en_text, ru_text, transcript_text, corrections_text) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, spokenEnglishText, russianTextForSpoken, transcript, validatedCorrections || '')
      .run();

    const historyId = Number(insertResult?.meta?.last_row_id || 0) || null;

    if (voiceAudio?.bytes?.byteLength) {
      const voiceSendResult = await sendVkVoiceMessageFromMp3({
        userId,
        groupId,
        token: env.VK_TOKEN,
        mp3Bytes: voiceAudio.bytes,
        mimeType: voiceAudio.mimeType,
        fileName: voiceAudio.fileName,
        message: 'Ответила голосом на английском 🎧',
      });

      if (!voiceSendResult?.ok) {
        console.error('[VOICE_DIALOG] VK voice upload failed, fallback to text', voiceSendResult?.error || voiceSendResult);
        await sendVkMessage({
          userId,
          groupId,
          token: env.VK_TOKEN,
          message: spokenEnglishText,
        });
      }
    } else {
      await sendVkMessage({
        userId,
        groupId,
        token: env.VK_TOKEN,
        message: spokenEnglishText,
      });
    }

    if (validatedCorrections) {
      await sendVkMessage({
        userId,
        groupId,
        token: env.VK_TOKEN,
        message: ['Разбор ошибки:', validatedCorrections].join('\n'),
      });
    }

    await sendVkMessage({
      userId,
      groupId,
      token: env.VK_TOKEN,
      message: buildVoiceRevealText({
        enText: spokenEnglishText,
        ruText: russianTextForSpoken,
        enShown: false,
        ruShown: false,
      }),
      keyboard: buildVoiceRevealKeyboard(historyId, false, false),
    });

    await compressHistoryIfNeeded(env.DB, env.OPENROUTER_API_KEY, userId, env.OPENROUTER_SITE_URL, env.OPENROUTER_SITE_TITLE, trackUsage);

    return { ok: true };
  } catch (error) {
    console.error('[VOICE_DIALOG] Ошибка обработки voice task', error);
    const isTranscribeRateLimit = isRateLimitError(error);

    await sendVkMessage({
      userId,
      groupId,
      token: env.VK_TOKEN,
      message: isTranscribeRateLimit
        ? 'Сервис распознавания сейчас перегружен. Попробуй отправить голосовое еще раз через 15-30 секунд.'
        : 'Что-то пошло не так при обработке голоса. Попробуй еще раз через несколько секунд.',
    });
    return { ok: false, reason: isTranscribeRateLimit ? 'transcription_rate_limited' : 'processing_failed' };
  }
}

async function ensureVoiceTables(db) {
  if (!db) {
    console.error('[D1_ERROR] DB binding отсутствует при работе с voice dialog');
    return;
  }

  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS voice_reply_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vk_id BIGINT NOT NULL,
        transcript_text TEXT NOT NULL,
        en_text TEXT NOT NULL,
        ru_text TEXT NOT NULL,
        corrections_text TEXT NOT NULL DEFAULT '',
        en_shown INTEGER NOT NULL DEFAULT 0,
        ru_shown INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vk_id) REFERENCES users_vk(vk_id)
      )
    `)
    .run();

  await ensureVoiceReplyColumn(db, 'corrections_text', "TEXT NOT NULL DEFAULT ''");

  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vk_id BIGINT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vk_id) REFERENCES users_vk(vk_id)
      )
    `)
    .run();

  await ensureChatHistoryColumn(db, 'translation_ru', 'TEXT');
  await ensureChatHistoryColumn(db, 'reasoning_details', 'TEXT');
  await ensureChatHistoryColumn(db, 'translation_shown', 'INTEGER NOT NULL DEFAULT 0');

  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS user_memory (
        vk_id BIGINT PRIMARY KEY,
        context_summary TEXT DEFAULT '',
        last_compressed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vk_id) REFERENCES users_vk(vk_id)
      )
    `)
    .run();

  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS voice_token_usage_daily (
        vk_id BIGINT NOT NULL,
        date_day DATE DEFAULT (CURRENT_DATE),
        incoming_tokens INTEGER NOT NULL DEFAULT 0,
        outgoing_tokens INTEGER NOT NULL DEFAULT 0,
        total_requests INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (vk_id, date_day),
        FOREIGN KEY (vk_id) REFERENCES users_vk(vk_id)
      )
    `)
    .run();
}

async function trackVoiceTokenUsage(db, userId, usage) {
  if (!db || !Number.isInteger(userId) || userId <= 0) {
    return;
  }

  const incomingTokens = Number(usage?.incomingTokens || 0);
  const outgoingTokens = Number(usage?.outgoingTokens || 0);

  if (incomingTokens <= 0 && outgoingTokens <= 0) {
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  await db
    .prepare(`
      INSERT INTO voice_token_usage_daily (vk_id, date_day, incoming_tokens, outgoing_tokens, total_requests)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(vk_id, date_day)
      DO UPDATE SET
        incoming_tokens = incoming_tokens + excluded.incoming_tokens,
        outgoing_tokens = outgoing_tokens + excluded.outgoing_tokens,
        total_requests = total_requests + 1
    `)
    .bind(userId, today, incomingTokens, outgoingTokens)
    .run();
}

async function ensureVoiceReplyColumn(db, columnName, sqlType) {
  const tableInfo = await db.prepare('PRAGMA table_info(voice_reply_history)').all();
  const columns = (tableInfo.results || []).map((column) => column.name);

  if (!columns.includes(columnName)) {
    await db.prepare(`ALTER TABLE voice_reply_history ADD COLUMN ${columnName} ${sqlType}`).run();
  }
}

async function ensureChatHistoryColumn(db, columnName, sqlType) {
  const tableInfo = await db.prepare('PRAGMA table_info(chat_history)').all();
  const columns = (tableInfo.results || []).map((column) => column.name);

  if (!columns.includes(columnName)) {
    await db.prepare(`ALTER TABLE chat_history ADD COLUMN ${columnName} ${sqlType}`).run();
  }
}

async function getCurrentSummary(db, userId) {
  const row = await db.prepare('SELECT context_summary FROM user_memory WHERE vk_id = ? LIMIT 1').bind(userId).first();
  return row?.context_summary || '';
}

async function getUserLevel(db, userId) {
  const row = await db.prepare('SELECT level_id FROM users_vk WHERE vk_id = ? LIMIT 1').bind(userId).first();
  const level = Number(row?.level_id || 1);
  return Number.isInteger(level) && level > 0 ? level : 1;
}

async function getRecentHistory(db, userId, limit) {
  const result = await db
    .prepare('SELECT role, content FROM chat_history WHERE vk_id = ? ORDER BY id DESC LIMIT ?')
    .bind(userId, limit)
    .all();

  return (result.results || []).reverse();
}

function buildVoiceDialogMessages({ summary, historyRows, userText, level = 1 }) {
  const latestUserText = String(userText || '').trim();
  const memoryLines = buildVoiceMemoryLines(summary, historyRows);
  const messages = [
    {
      role: 'system',
      content: buildVoiceSystemPrompt(summary, level, latestUserText, memoryLines),
    },
    {
      role: 'user',
      content: latestUserText,
    },
  ];

  return messages;
}

function buildVoiceSystemPrompt(summary, level = 1, latestUserText = '', memoryLines = []) {
  const latestText = latestUserText || 'N/A';
  const memoryText = memoryLines.length > 0 ? memoryLines.join('\n') : 'No relevant short-term memory.';
  let levelGuidance = '';

  if (level === 1) {
    levelGuidance = 'Level 1 (Novice): Use very simple vocabulary (A1-A2), 1-2 short sentences, present/simple tense first, no idioms, no abstract wording.';
  } else if (level === 2) {
    levelGuidance = 'Level 2 (Basic): Use clear everyday vocabulary (A2-B1), 2-3 short-medium sentences, limited complex grammar, avoid heavy academic wording.';
  } else {
    levelGuidance = 'Level 3 (Intermediate): Use natural B1-B2 vocabulary with richer structure, but keep response concise and voice-friendly.';
  }

  return [
    'IDENTITY AND ROLE:',
    'You are Lexi, a warm, intelligent English tutor for Russian-speaking learners.',
    'You are not the user. You are the assistant, teacher, and conversation partner.',
    'If the user asks who you are or your name, answer clearly: "My name is Lexi" and briefly explain how you help.',
    'Never address the user as "Lexi" unless the user explicitly says their own name is Lexi.',
    '',
    'MISSION:',
    'Help the learner speak better English through natural conversation, clear corrections, and confidence-building support.',
    'Keep communication practical, friendly, and focused on progress.',
    'Prioritize fluency first, then accuracy, while keeping replies easy to follow in voice format.',
    '',
    'TEACHING STYLE:',
    'Use encouraging language and short spoken-friendly sentences.',
    'Be specific and useful, avoid vague praise and generic filler text.',
    'When correcting mistakes, stay respectful and constructive.',
    'Do not over-correct when user message is already good enough for current level.',
    levelGuidance,
    '',
    'CONTEXT RULES:',
    'CRITICAL PRIORITY: Always answer the latest user message from this turn.',
    'Use memory only as supporting context. Memory must never override or replace the latest user request.',
    'If memory conflicts with the latest user message, follow the latest user message.',
    '',
    'LONG-TERM MEMORY (stable profile, goals, preferences):',
    String(summary || 'No long-term memory available.'),
    'SHORT-TERM MEMORY (recent turns for continuity):',
    memoryText,
    `Latest user message to answer: ${latestText}`,
    '',
    'OUTPUT CONTRACT (STRICT):',
    'Return only JSON object with fields: en, ru, corrections.',
    'en: your final spoken English reply, concise and natural.',
    'ru: accurate Russian translation of en.',
    'corrections: empty string if user made no real language mistakes.',
    'If user made grammar/spelling/vocabulary/pronunciation mistakes, provide short Russian correction in corrections.',
    'Do not use corrections for optional style tips or motivational comments.',
    'No markdown tables. Keep corrections in 1-3 short lines.',
    'IMPORTANT: Match learner level exactly. For level 1, keep wording very easy and short.',
  ].join(' ');
}

function buildVoiceMemoryLines(summary, historyRows) {
  const lines = [];

  const summaryText = String(summary || '').trim();
  if (summaryText) {
    lines.push(`- long_term: ${summaryText}`);
  }

  const recentRows = Array.isArray(historyRows) ? historyRows : [];
  for (const row of recentRows.slice(-4)) {
    const role = row?.role === 'assistant' ? 'assistant' : 'user';
    const content = String(row?.content || '').trim();
    if (!content) {
      continue;
    }

    lines.push(`- ${role}: ${content}`);
  }

  return lines;
}

function buildDirectReplyIfNeeded(transcript, level = 1) {
  const text = String(transcript || '').toLowerCase();

  if (!isIdentityQuestion(text)) {
    return null;
  }

  const introEn = level === 1
    ? "Hi! I'm Lexi, your English tutor. I help you practice English, correct mistakes, and build confidence step by step."
    : level === 2
      ? "Hi! I'm Lexi, your English tutor. I help you practice English with clear explanations, corrections, and natural conversation."
      : "Hi! I'm Lexi, your English tutor. I help you practice English naturally, improve accuracy, and hold real conversations at your level.";

  const introRu = level === 1
    ? 'Привет! Я Lexi, твой преподаватель английского. Я помогаю практиковать английский, исправлять ошибки и постепенно увереннее говорить.'
    : level === 2
      ? 'Привет! Я Lexi, твой преподаватель английского. Я помогаю практиковать английский с понятными объяснениями, исправлениями и живым диалогом.'
      : 'Привет! Я Lexi, твой преподаватель английского. Я помогаю практиковать английский естественно, повышать точность и вести реальные диалоги на твоем уровне.';

  return {
    en: introEn,
    ru: introRu,
    corrections: undefined,
  };
}

function isIdentityQuestion(text) {
  const normalized = String(text || '').toLowerCase();

  const asksName = /what\s+is\s+your\s+name|what'?s\s+your\s+name|what is your name|tell me your name|your name/i.test(normalized);
  const asksAboutSelf = /tell me about yourself|who are you|introduce yourself|say me about yourself|about yourself/i.test(normalized);
  const asksRole = /what do you do|what are you|who is lexi|what is lexi/i.test(normalized);

  return asksName || asksAboutSelf || asksRole;
}

function shouldUseMemoryForTranscript(transcript) {
  const text = String(transcript || '').toLowerCase();

  // For direct factual questions, memory often causes topic drift.
  const factualPatterns = [
    /tell me about/i,
    /who is/i,
    /what is/i,
    /please explain/i,
    /can you explain/i,
    /give me information about/i,
  ];

  return !factualPatterns.some((pattern) => pattern.test(text));
}

async function downloadAudio(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('[VOICE_DIALOG] Ошибка загрузки аудио', error);
    return null;
  }
}

async function transcribeAudio({ apiKey, base64Audio, format, siteUrl, siteTitle, onUsage }) {
  let lastError = null;

  for (let attempt = 1; attempt <= TRANSCRIBE_MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(OPENROUTER_TRANSCRIBE_URL, {
        method: 'POST',
        headers: buildOpenRouterHeaders(apiKey, siteUrl, siteTitle),
        body: JSON.stringify({
          model: OPENROUTER_TRANSCRIBE_MODEL,
          input_audio: {
            data: base64Audio,
            format,
          },
        }),
      });

      const textBody = await response.text();
      let data = null;

      try {
        data = JSON.parse(textBody);
      } catch {
        throw new Error(`OpenRouter transcription returned non-JSON: ${textBody}`);
      }

      if (!response.ok || data?.error) {
        const err = new Error(`OpenRouter transcription failed: ${data?.error?.message || textBody}`);
        if (response.status === 429 && attempt < TRANSCRIBE_MAX_RETRIES) {
          const delayMs = TRANSCRIBE_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
          console.warn(`[VOICE_DIALOG] Transcription rate-limited, retry attempt=${attempt} delay_ms=${delayMs}`);
          await sleep(delayMs);
          continue;
        }

        throw err;
      }

      const usage = extractTokenUsage(data);
      if (onUsage) {
        await onUsage(usage);
      }

      return { text: String(data?.text || '').trim(), usage };
    } catch (error) {
      lastError = error;

      if (!isRateLimitError(error) || attempt >= TRANSCRIBE_MAX_RETRIES) {
        break;
      }

      const delayMs = TRANSCRIBE_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      console.warn(`[VOICE_DIALOG] Transcription request failed with 429, retry attempt=${attempt} delay_ms=${delayMs}`);
      await sleep(delayMs);
    }
  }

  throw lastError || new Error('OpenRouter transcription failed: unknown_error');
}

function isRateLimitError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('429') || message.includes('rate limit') || message.includes('too many requests');
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateVoiceReply({ apiKey, modelMessages, siteUrl, siteTitle, onUsage }) {
  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: buildOpenRouterHeaders(apiKey, siteUrl, siteTitle),
    body: JSON.stringify({
      model: OPENROUTER_REPLY_MODEL,
      messages: modelMessages,
    }),
  });

  const textBody = await response.text();
  let data = null;

  try {
    data = JSON.parse(textBody);
  } catch {
    throw new Error(`OpenRouter chat returned non-JSON: ${textBody}`);
  }

  if (!response.ok || data?.error) {
    throw new Error(`OpenRouter chat failed: ${data?.error?.message || textBody}`);
  }

  const usage = extractTokenUsage(data);
  if (onUsage) {
    await onUsage(usage);
  }

  const rawContent = String(data?.choices?.[0]?.message?.content || '').trim();
  return parseReplyJson(rawContent);
}

async function synthesizeEnglishAudio({ apiKey, englishText, siteUrl, siteTitle, onUsage }) {
  const payload = {
    model: OPENROUTER_AUDIO_MODEL,
    modalities: ['text', 'audio'],
    audio: {
      voice: 'nova',
      format: 'mp3',
    },
    messages: [
      {
        role: 'system',
        content: 'Speak naturally and clearly in English. Return the exact text without adding new sentences.',
      },
      {
        role: 'user',
        content: englishText,
      },
    ],
  };

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: buildOpenRouterHeaders(apiKey, siteUrl, siteTitle),
    body: JSON.stringify(payload),
  });

  const textBody = await response.text();
  let data = null;

  try {
    data = JSON.parse(textBody);
  } catch {
    throw new Error(`OpenRouter audio returned non-JSON: ${textBody}`);
  }

  if (!response.ok || data?.error) {
    const errorMessage = String(data?.error?.message || textBody || 'unknown audio error');

    // OpenRouter can require stream=true for audio in some providers.
    // Retry once in streaming mode and collect audio chunks.
    if (/requires\s+stream\s*:\s*true/i.test(errorMessage)) {
      console.warn('[VOICE_DIALOG] Audio provider requires stream=true, retrying with SSE stream');
      return synthesizeEnglishAudioStreamed({ apiKey, payload, siteUrl, siteTitle, onUsage });
    }

    throw new Error(`OpenRouter audio failed: ${errorMessage}`);
  }

  const usage = extractTokenUsage(data);
  if (onUsage) {
    await onUsage(usage);
  }

  const message = data?.choices?.[0]?.message || {};
  const base64Audio = String(message?.audio?.data || message?.output_audio?.data || '').trim();
  const spokenText = extractAssistantTextFromMessage(message);

  if (!base64Audio) {
    return null;
  }

  return {
    bytes: base64ToUint8Array(base64Audio),
    mimeType: 'audio/mpeg',
    fileName: 'lexi-response.mp3',
    spokenText,
  };
}

async function synthesizeEnglishAudioStreamed({ apiKey, payload, siteUrl, siteTitle, onUsage }) {
  const streamPayload = {
    ...payload,
    stream: true,
    audio: {
      ...payload.audio,
      format: 'pcm16',
    },
  };

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: buildOpenRouterHeaders(apiKey, siteUrl, siteTitle),
    body: JSON.stringify(streamPayload),
  });

  if (!response.ok) {
    const raw = await response.text();
    console.error('[VOICE_DIALOG] OpenRouter streaming audio request failed', raw);
    return null;
  }

  if (!response.body) {
    throw new Error('OpenRouter streaming audio has empty body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalAudioBase64 = '';
  const audioParts = [];
  let finalSpokenText = '';
  const textParts = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let separatorIndex = buffer.indexOf('\n\n');
    while (separatorIndex !== -1) {
      const rawEvent = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      for (const line of rawEvent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) {
          continue;
        }

        const dataPart = trimmed.slice(5).trim();
        if (!dataPart || dataPart === '[DONE]') {
          continue;
        }

        let chunk = null;
        try {
          chunk = JSON.parse(dataPart);
        } catch {
          continue;
        }

        const chunkUsage = extractTokenUsage(chunk);
        if (onUsage && (chunkUsage.incomingTokens > 0 || chunkUsage.outgoingTokens > 0)) {
          await onUsage(chunkUsage);
        }

        const extracted = extractAudioFromStreamChunk(chunk);
        if (extracted.finalData) {
          finalAudioBase64 = extracted.finalData;
        }

        if (extracted.finalText) {
          finalSpokenText = extracted.finalText;
        }

        if (extracted.deltaData.length > 0) {
          audioParts.push(...extracted.deltaData);
        }

        if (extracted.deltaText.length > 0) {
          textParts.push(...extracted.deltaText);
        }
      }

      separatorIndex = buffer.indexOf('\n\n');
    }
  }

  const mergedAudio = finalAudioBase64 || audioParts.join('');
  if (!mergedAudio) {
    return null;
  }

  return {
    bytes: pcm16Base64ToWavBytes(mergedAudio),
    mimeType: 'audio/wav',
    fileName: 'lexi-response.wav',
    spokenText: (finalSpokenText || textParts.join('')).trim() || undefined,
  };
}

function extractAudioFromStreamChunk(chunk) {
  const choice = chunk?.choices?.[0] || {};
  const message = choice?.message || {};
  const delta = choice?.delta || {};
  const deltaData = [];
  const deltaText = [];

  const finalData =
    String(
      message?.audio?.data
      || message?.output_audio?.data
      || chunk?.audio?.data
      || chunk?.output_audio?.data
      || ''
    ).trim();

  const directDelta = String(delta?.audio?.data || delta?.output_audio?.data || '').trim();
  if (directDelta) {
    deltaData.push(directDelta);
  }

  const deltaTextDirect = extractAssistantTextFromMessage(delta);
  if (deltaTextDirect) {
    deltaText.push(deltaTextDirect);
  }

  const deltaContent = Array.isArray(delta?.content) ? delta.content : [];
  for (const part of deltaContent) {
    const partData = String(part?.audio?.data || part?.output_audio?.data || '').trim();
    if (partData) {
      deltaData.push(partData);
    }

    const partText = extractAssistantTextFromContentPart(part);
    if (partText) {
      deltaText.push(partText);
    }
  }

  const finalText = extractAssistantTextFromMessage(message) || extractAssistantTextFromMessage(chunk);

  return {
    finalData,
    deltaData,
    finalText,
    deltaText,
  };
}

function extractAssistantTextFromMessage(message) {
  if (!message || typeof message !== 'object') {
    return '';
  }

  const directText = typeof message.content === 'string' ? message.content : '';
  if (directText.trim()) {
    return directText.trim();
  }

  const contentParts = Array.isArray(message.content) ? message.content : [];
  const texts = [];

  for (const part of contentParts) {
    const partText = extractAssistantTextFromContentPart(part);
    if (partText) {
      texts.push(partText);
    }
  }

  return texts.join('').trim();
}

function extractAssistantTextFromContentPart(part) {
  if (!part || typeof part !== 'object') {
    return '';
  }

  if (typeof part.text === 'string' && part.text.trim()) {
    return part.text;
  }

  if (typeof part.content === 'string' && part.content.trim()) {
    return part.content;
  }

  if (typeof part.transcript === 'string' && part.transcript.trim()) {
    return part.transcript;
  }

  if (typeof part.output_text === 'string' && part.output_text.trim()) {
    return part.output_text;
  }

  return '';
}

function pcm16Base64ToWavBytes(base64Pcm, sampleRate = 24000, channels = 1) {
  const pcmBytes = base64ToUint8Array(base64Pcm);
  const bitsPerSample = 16;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcmBytes.length;
  const headerSize = 44;

  const wavBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(wavBuffer);
  const wavBytes = new Uint8Array(wavBuffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  wavBytes.set(pcmBytes, headerSize);

  return wavBytes;
}

function writeAscii(view, offset, text) {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

function parseReplyJson(rawContent) {
  const normalized = stripCodeFences(rawContent);

  try {
    const parsed = JSON.parse(normalized);
    const en = String(parsed?.en || '').trim();
    const ru = String(parsed?.ru || '').trim();
    const corrections = String(parsed?.corrections || '').trim();

    if (en && ru) {
      return {
        en,
        ru,
        corrections: corrections || undefined,
      };
    }
  } catch {
    console.warn('[VOICE_DIALOG] Модель вернула невалидный JSON, используем fallback');
  }

  const fallbackEn = normalized || 'Great, let us continue practicing English together.';
  return {
    en: fallbackEn,
    ru: 'Отлично, давайте продолжать практиковать английский вместе.',
    corrections: undefined,
  };
}

function normalizeCorrections(corrections, transcript) {
  const text = String(corrections || '').trim();
  if (!text) {
    return undefined;
  }

  if (!hasRealLanguageErrorSignals(text, transcript)) {
    return undefined;
  }

  return text;
}

async function enforceLevelAdaptiveEnglish({ englishText, level, transcript, apiKey, siteUrl, siteTitle, onUsage }) {
  const en = String(englishText || '').trim();
  if (!en) {
    return en;
  }

  if (!isResponseTooComplexForLevel(en, level)) {
    return en;
  }

  try {
    const rewritten = await rewriteEnglishByLevel({
      englishText: en,
      level,
      transcript,
      apiKey,
      siteUrl,
      siteTitle,
      onUsage,
    });

    return String(rewritten || '').trim() || en;
  } catch (error) {
    console.warn('[VOICE_DIALOG] Failed to adapt EN text to learner level, using original reply', error);
    return en;
  }
}

function isResponseTooComplexForLevel(text, level) {
  const normalized = String(text || '').trim();
  if (!normalized) {
    return false;
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  const sentenceCount = normalized.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length || 1;
  const longWords = words.filter((w) => w.replace(/[^a-zA-Z]/g, '').length >= 10).length;
  const avgWordLength = words.length > 0
    ? words.reduce((sum, w) => sum + w.replace(/[^a-zA-Z]/g, '').length, 0) / words.length
    : 0;

  if (level <= 1) {
    return words.length > 22 || sentenceCount > 2 || longWords > 2 || avgWordLength > 5.5;
  }

  if (level === 2) {
    return words.length > 42 || sentenceCount > 3 || longWords > 6 || avgWordLength > 6.5;
  }

  return words.length > 90 || sentenceCount > 5;
}

async function rewriteEnglishByLevel({ englishText, level, transcript, apiKey, siteUrl, siteTitle, onUsage }) {
  const levelRule = level <= 1
    ? 'Rewrite to A1-A2 English: very simple words, 1-2 short sentences, no idioms.'
    : level === 2
      ? 'Rewrite to A2-B1 English: clear everyday words, up to 2-3 short-medium sentences.'
      : 'Rewrite to B1-B2 English: natural, concise, and voice-friendly.';

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: buildOpenRouterHeaders(apiKey, siteUrl, siteTitle),
    body: JSON.stringify({
      model: OPENROUTER_REPLY_MODEL,
      messages: [
        {
          role: 'system',
          content: [
            'You rewrite English tutor replies to match learner level.',
            'Return plain English text only. No JSON. No explanations.',
            levelRule,
            'Keep original meaning and intent.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            `Learner level: ${level}`,
            `Latest user message: ${transcript}`,
            `Original reply: ${englishText}`,
          ].join('\n\n'),
        },
      ],
    }),
  });

  const body = await response.text();
  let data = null;

  try {
    data = JSON.parse(body);
  } catch {
    throw new Error(`Level rewrite returned non-JSON response: ${body}`);
  }

  if (!response.ok || data?.error) {
    throw new Error(`Level rewrite failed: ${data?.error?.message || body}`);
  }

  const usage = extractTokenUsage(data);
  if (onUsage) {
    await onUsage(usage);
  }

  return String(data?.choices?.[0]?.message?.content || '').trim();
}

async function ensureReplyMatchesLatestMessage({ reply, transcript, summary, recentHistory, level, apiKey, siteUrl, siteTitle, onUsage }) {
  const currentReply = reply || {};
  const en = String(currentReply.en || '').trim();
  const ru = String(currentReply.ru || '').trim();

  if (!needsReplyRegeneration(en, transcript)) {
    return currentReply;
  }

  console.warn('[VOICE_DIALOG] Detected role/topic mismatch, regenerating reply with strict latest-message focus');

  const strictMessages = [
    {
      role: 'system',
      content: [
        buildVoiceSystemPrompt('', level, transcript, []),
        'STRICT MODE: Ignore previous dialogue content except for concise context.',
        'Answer only the latest user message.',
        'Do not assume user identity.',
        'Never address user as Lexi unless user explicitly says their name is Lexi.',
      ].join(' '),
    },
    {
      role: 'user',
      content: transcript,
    },
  ];

  const regenerated = await generateVoiceReply({
    apiKey,
    modelMessages: strictMessages,
    siteUrl,
    siteTitle,
    onUsage,
  });

  const regeneratedEn = String(regenerated?.en || '').trim();
  const regeneratedRu = String(regenerated?.ru || '').trim();

  if (!regeneratedEn || !regeneratedRu) {
    return currentReply;
  }

  return regenerated;
}

function needsReplyRegeneration(englishReply, transcript) {
  const reply = String(englishReply || '').toLowerCase();
  const user = String(transcript || '').toLowerCase();

  if (!reply) {
    return false;
  }

  const callsUserLexi = /\bhi\s*,?\s*lexi\b|\bhello\s*,?\s*lexi\b|\blexi\b.*\bgreat to meet you\b/i.test(reply);
  const userIntroducedLexi = /my name is lexi|i am lexi|i'm lexi/.test(user);
  if (callsUserLexi && !userIntroducedLexi) {
    return true;
  }

  const asksAboutName = /what is your name|who are you|tell me about yourself/.test(user);
  const missesNameAnswer = asksAboutName && !/my name is lexi|i am lexi|i'm lexi/.test(reply);
  if (missesNameAnswer) {
    return true;
  }

  if (isLikelyOffTopic(user, reply)) {
    return true;
  }

  return false;
}

function isLikelyOffTopic(userText, replyText) {
  const user = String(userText || '').toLowerCase();
  const reply = String(replyText || '').toLowerCase();

  if (!user || !reply) {
    return false;
  }

  const obviousOffTopicPhrases = [
    'what book you are referring to',
    'about the book you are referring to',
    'could you share a bit more about the book',
    'what topic you have in mind',
  ];

  if (obviousOffTopicPhrases.some((phrase) => reply.includes(phrase)) && !user.includes('book')) {
    return true;
  }

  const userKeywords = extractKeywords(user);
  const replyKeywords = new Set(extractKeywords(reply));

  if (userKeywords.length === 0) {
    return false;
  }

  const overlap = userKeywords.filter((word) => replyKeywords.has(word)).length;
  const ratio = overlap / userKeywords.length;

  // Strongly factual user prompts require stronger topical alignment.
  const factualPrompt = /tell me about|who is|what is|please explain|can you explain/.test(user);
  if (factualPrompt) {
    return ratio < 0.25;
  }

  return ratio < 0.15;
}

function extractKeywords(text) {
  const stopWords = new Set([
    'please', 'tell', 'about', 'what', 'your', 'name', 'hello', 'could', 'would', 'should', 'there', 'this',
    'that', 'with', 'from', 'into', 'have', 'just', 'more', 'some', 'topic', 'queen'
  ]);

  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));
}

async function gateCorrectionsWithMiniCheck({ apiKey, transcript, corrections, siteUrl, siteTitle, validationModel, onUsage }) {
  if (!corrections) {
    return undefined;
  }

  try {
    const verdict = await verifyLanguageErrorWithMiniModel({
      apiKey,
      transcript,
      corrections,
      siteUrl,
      siteTitle,
      validationModel,
      onUsage,
    });

    return verdict.hasError ? corrections : undefined;
  } catch (error) {
    // Fallback: keep heuristically validated corrections if mini-check is unavailable.
    console.warn('[VOICE_DIALOG] Mini validation unavailable, using heuristic corrections', error);
    return corrections;
  }
}

async function verifyLanguageErrorWithMiniModel({ apiKey, transcript, corrections, siteUrl, siteTitle, validationModel, onUsage }) {
  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: buildOpenRouterHeaders(apiKey, siteUrl, siteTitle),
    body: JSON.stringify({
      model: validationModel,
      messages: [
        {
          role: 'system',
          content: [
            'You validate whether a correction block describes a real language mistake in user speech.',
            'Return strict JSON only: {"has_error":true|false}.',
            'Set has_error=true ONLY when user truly made grammar/spelling/vocabulary/pronunciation errors.',
            'Set has_error=false for neutral advice, style tips, or optional improvements.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [`User transcript: ${transcript || ''}`, `Correction block: ${corrections}`].join('\n\n'),
        },
      ],
    }),
  });

  const rawBody = await response.text();
  let data = null;

  try {
    data = JSON.parse(rawBody);
  } catch {
    throw new Error(`Mini-check returned non-JSON response: ${rawBody}`);
  }

  if (!response.ok || data?.error) {
    throw new Error(`Mini-check request failed: ${data?.error?.message || rawBody}`);
  }

  const usage = extractTokenUsage(data);
  if (onUsage) {
    await onUsage(usage);
  }

  const content = String(data?.choices?.[0]?.message?.content || '').trim();
  const normalized = stripCodeFences(content);
  let parsed = null;

  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new Error(`Mini-check content is not valid JSON: ${content}`);
  }

  return { hasError: Boolean(parsed?.has_error) };
}

function hasRealLanguageErrorSignals(correctionsText, transcript) {
  const correction = String(correctionsText || '').toLowerCase();
  const userText = String(transcript || '').toLowerCase();

  if (correction.length < 12) {
    return false;
  }

  const mistakeMarkers = /ошиб|неправ|некоррект|wrong|mistake|incorrect|вместо|лучше сказать|правильн|нужно сказать|should say|better to say/i;
  const pairMarkers = /(было\s*[:\-]|стало\s*[:\-]|вместо\s+.+\s+нужно|instead of|correct form|правильно\s*[:\-])/i;
  const softAdviceOnly = /(попробуй|можно также|совет|рекоменд|you can also|consider|try to)/i;

  const hasMistakeMarker = mistakeMarkers.test(correction) || pairMarkers.test(correction);
  const hasOnlyAdviceTone = softAdviceOnly.test(correction) && !hasMistakeMarker;
  const referencesUserFragment = userText.length > 0 && correction.includes(userText.slice(0, Math.min(16, userText.length)));

  if (hasOnlyAdviceTone) {
    return false;
  }

  return hasMistakeMarker || referencesUserFragment;
}

async function requestOpenRouter({ apiKey, messages, siteUrl, siteTitle, onUsage }) {
  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: buildOpenRouterHeaders(apiKey, siteUrl, siteTitle),
    body: JSON.stringify({
      model: OPENROUTER_REPLY_MODEL,
      messages,
    }),
  });

  const rawBody = await response.text();
  let data = null;

  try {
    data = JSON.parse(rawBody);
  } catch {
    throw new Error(`OpenRouter returned non-JSON response: ${rawBody}`);
  }

  if (!response.ok || data?.error) {
    throw new Error(`OpenRouter request failed: ${data?.error?.message || rawBody}`);
  }

  const usage = extractTokenUsage(data);
  if (onUsage) {
    await onUsage(usage);
  }

  const message = data?.choices?.[0]?.message;
  if (!message?.content) {
    throw new Error('OpenRouter response does not contain assistant content');
  }

  return message;
}

async function alignRussianTranslation({ apiKey, englishText, fallbackRussian, siteUrl, siteTitle, onUsage }) {
  const en = String(englishText || '').trim();
  const ruFallback = String(fallbackRussian || '').trim();

  if (!en) {
    return ruFallback;
  }

  try {
    const translationMessage = await requestOpenRouter({
      apiKey,
      siteUrl,
      siteTitle,
      onUsage,
      messages: [
        {
          role: 'system',
          content: 'Translate English to Russian accurately. Return only Russian translation text without explanations.',
        },
        {
          role: 'user',
          content: en,
        },
      ],
    });

    const translated = String(translationMessage?.content || '').trim();
    return translated || ruFallback;
  } catch (error) {
    console.warn('[VOICE_DIALOG] Failed to align RU translation with spoken EN, using fallback RU', error);
    return ruFallback;
  }
}

async function resolveSpokenEnglishText({ voiceAudio, fallbackEnglishText, apiKey, siteUrl, siteTitle, onUsage }) {
  const fallback = String(fallbackEnglishText || '').trim();

  if (voiceAudio?.bytes?.byteLength) {
    try {
      const format = voiceAudio.mimeType === 'audio/wav' ? 'wav' : 'mp3';
      const spokenFromAudio = await transcribeAudio({
        apiKey,
        base64Audio: uint8ArrayToBase64(voiceAudio.bytes),
        format,
        siteUrl,
        siteTitle,
        onUsage,
      });

      const normalized = String(spokenFromAudio?.text || '').trim();
      if (normalized) {
        return normalized;
      }
    } catch (error) {
      console.warn('[VOICE_DIALOG] Failed to transcribe generated voice audio for EN sync, fallback to model text', error);
    }
  }

  const spokenByProvider = String(voiceAudio?.spokenText || '').trim();
  return spokenByProvider || fallback;
}

async function compressHistoryIfNeeded(db, apiKey, userId, siteUrl, siteTitle, onUsage) {
  const countRow = await db.prepare('SELECT COUNT(*) AS total FROM chat_history WHERE vk_id = ?').bind(userId).first();
  const total = Number(countRow?.total || 0);

  if (total <= HISTORY_COMPRESS_THRESHOLD) {
    return;
  }

  const allHistory = await db
    .prepare('SELECT id, role, content FROM chat_history WHERE vk_id = ? ORDER BY id ASC')
    .bind(userId)
    .all();

  const historyRows = allHistory.results || [];
  const rowsToCompress = historyRows.slice(0, Math.max(0, historyRows.length - HISTORY_RETAIN_COUNT));
  if (rowsToCompress.length === 0) {
    return;
  }

  const currentSummary = await getCurrentSummary(db, userId);
  const chunkText = rowsToCompress.map((row) => `${row.role}: ${row.content}`).join('\n');

  const summaryMessage = await requestOpenRouter({
    apiKey,
    siteUrl,
    siteTitle,
    onUsage,
    messages: [
      {
        role: 'system',
        content: 'You maintain a concise summary of a student\'s English tutoring chat. Reply with plain text, 3-4 short sentences, focused on goals, preferences, repeated mistakes, and active topics.',
      },
      {
        role: 'user',
        content: `Current summary:\n${currentSummary || 'No previous summary.'}\n\nNew chat chunk:\n${chunkText}`,
      },
    ],
  });

  const nextSummary = String(summaryMessage.content || '').trim();
  if (!nextSummary) {
    return;
  }

  await db
    .prepare(`
      INSERT INTO user_memory (vk_id, context_summary, last_compressed_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(vk_id)
      DO UPDATE SET
        context_summary = excluded.context_summary,
        last_compressed_at = CURRENT_TIMESTAMP
    `)
    .bind(userId, nextSummary)
    .run();

  const idsToDelete = rowsToCompress.map((row) => row.id);
  const placeholders = idsToDelete.map(() => '?').join(', ');
  await db.prepare(`DELETE FROM chat_history WHERE id IN (${placeholders})`).bind(...idsToDelete).run();
}

function stripCodeFences(input) {
  if (!input) {
    return '';
  }

  if (input.startsWith('```')) {
    return input.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
  }

  return input;
}

function buildVoiceRevealText({ enText, ruText, enShown, ruShown }) {
  return [
    'Готово. Можно раскрыть текст ответа ниже:',
    '',
    enShown ? `Текст на английском:\n${enText}` : 'Текст на английском: скрыт',
    '',
    ruShown ? `Перевод на русский:\n${ruText}` : 'Перевод на русский: скрыт',
  ].join('\n');
}

function buildVoiceRevealKeyboard(historyId, enShown, ruShown) {
  const buttons = [];

  if (historyId && !enShown) {
    buttons.push([
      {
        action: {
          type: 'callback',
          label: 'Текст на английском',
          payload: JSON.stringify({
            v: PAYLOAD_VERSION,
            c: VOICE_REVEAL_EN_COMMAND,
            d: historyId,
          }),
        },
        color: 'primary',
      },
    ]);
  }

  if (historyId && !ruShown) {
    buttons.push([
      {
        action: {
          type: 'callback',
          label: 'Перевод на русский',
          payload: JSON.stringify({
            v: PAYLOAD_VERSION,
            c: VOICE_REVEAL_RU_COMMAND,
            d: historyId,
          }),
        },
        color: 'secondary',
      },
    ]);
  }

  return {
    inline: true,
    buttons,
  };
}

function buildOpenRouterHeaders(apiKey, siteUrl, siteTitle) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  if (siteUrl) {
    headers['HTTP-Referer'] = siteUrl;
  }

  if (siteTitle) {
    headers['X-OpenRouter-Title'] = siteTitle;
  }

  return headers;
}

function extractTokenUsage(payload) {
  const usage = payload?.usage || {};
  const incomingTokens = Number(
    usage.prompt_tokens
    ?? usage.input_tokens
    ?? usage.input_token_count
    ?? usage.tokens_in
    ?? 0
  );
  const outgoingTokens = Number(
    usage.completion_tokens
    ?? usage.output_tokens
    ?? usage.output_token_count
    ?? usage.tokens_out
    ?? 0
  );
  const totalTokens = Number(
    usage.total_tokens
    ?? usage.total
    ?? (Number.isFinite(incomingTokens) && Number.isFinite(outgoingTokens)
      ? incomingTokens + outgoingTokens
      : 0)
  );

  return {
    incomingTokens: Number.isFinite(incomingTokens) ? Math.max(0, Math.trunc(incomingTokens)) : 0,
    outgoingTokens: Number.isFinite(outgoingTokens) ? Math.max(0, Math.trunc(outgoingTokens)) : 0,
    totalTokens: Number.isFinite(totalTokens) ? Math.max(0, Math.trunc(totalTokens)) : 0,
  };
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function uint8ArrayToBase64(bytesInput) {
  const bytes = bytesInput instanceof Uint8Array ? bytesInput : new Uint8Array(bytesInput || []);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function answerEvent(eventContext, token, text) {
  if (!eventContext?.eventId) {
    return;
  }

  await answerVkMessageEvent({
    token,
    eventId: eventContext.eventId,
    userId: eventContext.eventUserId,
    peerId: eventContext.peerId,
    text,
  });
}
