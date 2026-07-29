import { sendVkMessage } from '../services/vkApi.js';

const PAYLOAD_VERSION = 1;
const STORY_QUEST_COMMAND = 'story_quest_menu';
const STORY_QUEST_START_COMMAND = 'story_quest_start';
const STORY_QUEST_PICK_CHOICE_COMMAND = 'story_quest_pick';
const STORY_QUEST_SHOW_TRANSLATION_COMMAND = 'story_quest_show_translation';
const STORY_QUEST_EXIT_COMMAND = 'story_quest_exit';
const SHOW_TARIFFS_COMMAND = 'show_tariffs';
const LEXI_MAIN_MENU_COMMAND = 'lexi_main_menu';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'deepseek/deepseek-v4-pro';

const STORY_SESSION_PREFIX = 'story_quest_session_';
const STORY_DAILY_PREFIX = 'story_quest_daily_';
const STORY_DAILY_LIMIT = 2;
const STORY_MAX_STEPS = 20;
const STORY_SESSION_TTL_SECONDS = 60 * 60 * 24 * 3;

const STORY_GENRES = [
    { code: 'horror', title: 'Хоррор' },
    { code: 'sci_fi', title: 'Фантастическая история' },
    { code: 'fantasy', title: 'Приключение фэнтези' },
    { code: 'space', title: 'Космическое приключение' },
    { code: 'comedy', title: 'Комедийная история' },
    { code: 'detective', title: 'Детективная история' },
    { code: 'post_apocalypse', title: 'Постапокалипсис' },
    { code: 'romance', title: 'Романтика' },
];

export function storyQuestPayload() {
    return JSON.stringify({ v: PAYLOAD_VERSION, c: STORY_QUEST_COMMAND });
}

function storyQuestStartPayload(genreCode) {
    return JSON.stringify({ v: PAYLOAD_VERSION, c: STORY_QUEST_START_COMMAND, g: genreCode });
}

function storyQuestPickPayload(choiceIndex) {
    return JSON.stringify({ v: PAYLOAD_VERSION, c: STORY_QUEST_PICK_CHOICE_COMMAND, i: Number(choiceIndex) });
}

function storyQuestShowTranslationPayload() {
    return JSON.stringify({ v: PAYLOAD_VERSION, c: STORY_QUEST_SHOW_TRANSLATION_COMMAND });
}

function storyQuestExitPayload() {
    return JSON.stringify({ v: PAYLOAD_VERSION, c: STORY_QUEST_EXIT_COMMAND });
}

function showTariffsPayload() {
    return JSON.stringify({ v: PAYLOAD_VERSION, c: SHOW_TARIFFS_COMMAND });
}

function lexiMainMenuPayload() {
    return JSON.stringify({ v: PAYLOAD_VERSION, c: LEXI_MAIN_MENU_COMMAND });
}

export function isStoryQuestCommand(payload) {
    return payload?.v === PAYLOAD_VERSION && payload?.c === STORY_QUEST_COMMAND;
}

export function isStoryQuestActionCommand(payload) {
    if (payload?.v !== PAYLOAD_VERSION) return false;
    return [
        STORY_QUEST_START_COMMAND,
        STORY_QUEST_PICK_CHOICE_COMMAND,
        STORY_QUEST_SHOW_TRANSLATION_COMMAND,
        STORY_QUEST_EXIT_COMMAND,
    ].includes(payload?.c);
}

export async function handleStoryQuestMenu({ env, userId, groupId, token }) {
    const access = await ensureQuestAccess(env?.DB, userId);
    if (!access.allowed) {
        return sendVkMessage({
            userId,
            groupId,
            token,
            message: [
                'StoryQuest с Lexi',
                '',
                'Этот режим доступен с тарифа Intermediate и выше.',
                'Подключи подходящий тариф, чтобы открыть интерактивные истории.',
            ].join('\n'),
            keyboard: {
                inline: true,
                buttons: [
                    [{ action: { type: 'callback', label: 'Выбрать тариф', payload: showTariffsPayload() }, color: 'primary' }],
                    [{ action: { type: 'callback', label: 'Главное меню', payload: lexiMainMenuPayload() }, color: 'secondary' }],
                ],
            },
        });
    }

    const daily = await getDailyState(env?.KV, userId);

    return sendVkMessage({
        userId,
        groupId,
        token,
        message: [
            'StoryQuest с Lexi',
            '',
            `Лимит новых историй сегодня: ${daily.startedToday}/${STORY_DAILY_LIMIT}.`,
            `Максимум шагов в одной истории: ${STORY_MAX_STEPS}.`,
            'Выбери жанр и начни приключение.',
        ].join('\n'),
        keyboard: buildStoryGenreKeyboard(),
    });
}

export async function handleStoryQuestAction({ env, userId, groupId, token, payload }) {
    if (!env?.KV) {
        return sendVkMessage({ userId, groupId, token, message: 'KV недоступен. Попробуй позже.' });
    }

    if (payload?.c === STORY_QUEST_EXIT_COMMAND) {
        await clearStorySession(env.KV, userId);
        return sendVkMessage({
            userId,
            groupId,
            token,
            message: 'Квест завершен. Возвращаемся в главное меню.',
            keyboard: {
                inline: true,
                buttons: [[{ action: { type: 'callback', label: 'Главное меню', payload: lexiMainMenuPayload() }, color: 'secondary' }]],
            },
        });
    }

    if (payload?.c === STORY_QUEST_SHOW_TRANSLATION_COMMAND) {
        const session = await getStorySession(env.KV, userId);
        if (!session?.sceneRu) {
            return sendVkMessage({
                userId,
                groupId,
                token,
                message: 'Перевод пока недоступен. Сделай следующий шаг истории.',
                keyboard: buildStoryStepKeyboard(session),
            });
        }

        return sendVkMessage({
            userId,
            groupId,
            token,
            message: `🇷🇺 Перевод:\n${session.sceneRu}`,
            keyboard: buildStoryStepKeyboard(session),
        });
    }

    if (payload?.c === STORY_QUEST_START_COMMAND) {
        const access = await ensureQuestAccess(env?.DB, userId);
        if (!access.allowed) {
            return sendVkMessage({
                userId,
                groupId,
                token,
                message: 'Режим доступен только с тарифа Intermediate и выше.',
                keyboard: {
                    inline: true,
                    buttons: [[{ action: { type: 'callback', label: 'Выбрать тариф', payload: showTariffsPayload() }, color: 'primary' }]],
                },
            });
        }

        const genreCode = String(payload?.g || '');
        const genre = STORY_GENRES.find((g) => g.code === genreCode);
        if (!genre) {
            return sendVkMessage({
                userId,
                groupId,
                token,
                message: 'Не удалось определить жанр. Выбери жанр еще раз.',
                keyboard: buildStoryGenreKeyboard(),
            });
        }

        const existingSession = await getStorySession(env.KV, userId);
        if (existingSession?.active && existingSession?.stepCount < STORY_MAX_STEPS) {
            return sendVkMessage({
                userId,
                groupId,
                token,
                message: [
                    'У тебя уже есть активная история.',
                    `Жанр: ${existingSession.genreTitle}.`,
                    `Шаг: ${existingSession.stepCount}/${STORY_MAX_STEPS}.`,
                    'Продолжай текущую историю или заверши ее.',
                ].join('\n'),
                keyboard: buildStoryStepKeyboard(existingSession),
            });
        }

        const daily = await getDailyState(env.KV, userId);
        if (daily.startedToday >= STORY_DAILY_LIMIT) {
            return sendVkMessage({
                userId,
                groupId,
                token,
                message: `Лимит новых историй на сегодня достигнут (${STORY_DAILY_LIMIT}). Завтра сможешь начать новую.`,
                keyboard: {
                    inline: true,
                    buttons: [[{ action: { type: 'callback', label: 'Главное меню', payload: lexiMainMenuPayload() }, color: 'secondary' }]],
                },
            });
        }

        const promptContext = await getPromptContext(env.DB, userId);
        const generated = await generateStoryStep({
            apiKey: env?.OPENROUTER_API_KEY,
            genre,
            level: promptContext.level,
            styleCode: promptContext.styleCode,
            previousScene: '',
            selectedChoice: '',
            stepCount: 0,
        });

        const session = {
            sessionId: crypto.randomUUID(),
            active: true,
            genreCode: genre.code,
            genreTitle: genre.title,
            level: promptContext.level,
            styleCode: promptContext.styleCode,
            stepCount: 1,
            sceneEn: generated.sceneEn,
            sceneRu: generated.sceneRu,
            choices: generated.choices,
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            history: [],
        };

        await saveStorySession(env.KV, userId, session);
        await incrementDailyState(env.KV, userId);
        await ensureStoryTables(env.DB);
        await insertStorySessionStart(env.DB, userId, session);

        return sendVkMessage({
            userId,
            groupId,
            token,
            message: formatStoryScene(session),
            keyboard: buildStoryStepKeyboard(session),
        });
    }

    if (payload?.c === STORY_QUEST_PICK_CHOICE_COMMAND) {
        const session = await getStorySession(env.KV, userId);
        if (!session?.active) {
            return sendVkMessage({
                userId,
                groupId,
                token,
                message: 'Активной истории нет. Сначала выбери жанр и начни историю.',
                keyboard: buildStoryGenreKeyboard(),
            });
        }

        if (session.stepCount >= STORY_MAX_STEPS) {
            await completeStorySession(env.DB, userId, session, 'completed');
            await clearStorySession(env.KV, userId);
            return sendVkMessage({
                userId,
                groupId,
                token,
                message: `История завершена. Достигнут лимит шагов (${STORY_MAX_STEPS}).`,
                keyboard: buildStoryGenreKeyboard(),
            });
        }

        const choiceIndex = Number(payload?.i);
        const selectedChoice = session.choices?.[choiceIndex];
        if (!selectedChoice) {
            return sendVkMessage({
                userId,
                groupId,
                token,
                message: 'Вариант не найден. Выбери один из предложенных вариантов.',
                keyboard: buildStoryStepKeyboard(session),
            });
        }

        const generated = await generateStoryStep({
            apiKey: env?.OPENROUTER_API_KEY,
            genre: { code: session.genreCode, title: session.genreTitle },
            level: session.level,
            styleCode: session.styleCode,
            previousScene: session.sceneEn,
            selectedChoice,
            stepCount: session.stepCount,
        });

        const nextSession = {
            ...session,
            stepCount: session.stepCount + 1,
            sceneEn: generated.sceneEn,
            sceneRu: generated.sceneRu,
            choices: generated.choices,
            updatedAt: new Date().toISOString(),
            history: [...(session.history || []), selectedChoice].slice(-10),
        };

        await saveStorySession(env.KV, userId, nextSession);
        await updateStorySessionStep(env.DB, userId, nextSession);

        if (nextSession.stepCount >= STORY_MAX_STEPS) {
            await completeStorySession(env.DB, userId, nextSession, 'completed');
            await clearStorySession(env.KV, userId);
            return sendVkMessage({
                userId,
                groupId,
                token,
                message: [formatStoryScene(nextSession), '', `История завершена (${STORY_MAX_STEPS} шагов).`].join('\n'),
                keyboard: buildStoryGenreKeyboard(),
            });
        }

        return sendVkMessage({
            userId,
            groupId,
            token,
            message: formatStoryScene(nextSession),
            keyboard: buildStoryStepKeyboard(nextSession),
        });
    }

    return sendVkMessage({ userId, groupId, token, message: 'Неизвестное действие квеста.' });
}

function buildStoryGenreKeyboard() {
    const genreButtons = STORY_GENRES.map((genre) => ({
        action: {
            type: 'callback',
            label: genre.title,
            payload: storyQuestStartPayload(genre.code),
        },
        color: 'primary',
    }));

    const genreRows = [];
    for (let i = 0; i < genreButtons.length; i += 2) {
        genreRows.push(genreButtons.slice(i, i + 2));
    }

    return {
        inline: true,
        buttons: [
            ...genreRows,
            [{ action: { type: 'callback', label: 'Главное меню', payload: lexiMainMenuPayload() }, color: 'secondary' }],
        ],
    };
}

function buildStoryStepKeyboard(session) {
    const choiceRows = (session?.choices || []).slice(0, 3).map((choice, index) => [
        {
            action: {
                type: 'callback',
                label: choice,
                payload: storyQuestPickPayload(index),
            },
            color: 'primary',
        },
    ]);

    return {
        inline: true,
        buttons: [
            ...choiceRows,
            [{ action: { type: 'callback', label: 'Показать перевод 🇷🇺', payload: storyQuestShowTranslationPayload() }, color: 'secondary' }],
            [{ action: { type: 'callback', label: 'Выйти из квеста', payload: storyQuestExitPayload() }, color: 'secondary' }],
        ],
    };
}

function formatStoryScene(session) {
    return [
        `StoryQuest | ${session.genreTitle}`,
        `Шаг ${session.stepCount}/${STORY_MAX_STEPS}`,
        '',
        session.sceneEn,
    ].join('\n');
}

async function ensureQuestAccess(db, userId) {
    if (!db) return { allowed: false, tier: 'free' };

    const user = await db.prepare('SELECT subscription_tier FROM users_vk WHERE vk_id = ? LIMIT 1').bind(userId).first();
    const donutState = await getDonutAccessState(db, userId);
    const currentTier = normalizeTier(user?.subscription_tier);
    const effectiveTier = donutState.isActive && currentTier !== 'free' ? currentTier : 'free';

    if (effectiveTier !== currentTier) {
        await db.prepare('UPDATE users_vk SET subscription_tier = ? WHERE vk_id = ?').bind(effectiveTier, userId).run();
    }

    return { allowed: ['tier2', 'tier3'].includes(effectiveTier), tier: effectiveTier };
}

function normalizeTier(tier) {
    const value = String(tier || 'free').toLowerCase();

    if (value === 'advanced') return 'tier3';
    if (value === 'intermediate') return 'tier2';
    if (value === 'beginner') return 'tier1';

    if (['free', 'tier1', 'tier2', 'tier3'].includes(value)) {
        return value;
    }
    return 'free';
}

async function getPromptContext(db, userId) {
    if (!db) return { level: 1, styleCode: 'friendly_friend' };
    const row = await db.prepare('SELECT level_id, lexi_style FROM users_vk WHERE vk_id = ? LIMIT 1').bind(userId).first();
    return {
        level: normalizeQuestLevel(row?.level_id),
        styleCode: normalizeStyleCode(row?.lexi_style),
    };
}

function normalizeQuestLevel(level) {
    const value = Number(level) || 1;
    if (value <= 1) return 1;
    if (value === 2) return 2;
    return 3;
}

function normalizeStyleCode(rawStyle) {
    const style = String(rawStyle || '').trim().toLowerCase();
    if (style === 'futurist') return 'future_traveler';
    if (['oxford_professor', 'future_traveler', 'friendly_friend'].includes(style)) {
        return style;
    }
    return 'friendly_friend';
}

async function getDonutAccessState(db, userId) {
    try {
        const row = await db.prepare(`
      SELECT
        MAX(CASE WHEN action IN ('create', 'prolonged') THEN created_at END) AS last_paid_at,
        CAST((julianday('now') - julianday(MAX(CASE WHEN action IN ('create', 'prolonged') THEN created_at END))) AS REAL) AS days_since_paid,
        MAX(CASE WHEN action IN ('cancelled', 'expired') THEN created_at END) AS last_stop_at,
        CAST((julianday('now') - julianday(MAX(CASE WHEN action IN ('cancelled', 'expired') THEN created_at END))) AS REAL) AS days_since_stop
      FROM donut_logs WHERE vk_id = ?
    `).bind(userId).first();

        const paidActive = row?.last_paid_at && row.days_since_paid < 30;
        const recoveryActive = !row?.last_paid_at && row?.last_stop_at && row.days_since_stop < 30;
        return { isActive: Boolean(paidActive || recoveryActive) };
    } catch {
        return { isActive: false };
    }
}

async function getDailyState(kv, userId) {
    if (!kv) return { dateDay: getTodayDate(), startedToday: 0 };
    const key = `${STORY_DAILY_PREFIX}${userId}`;
    const raw = await kv.get(key);
    const today = getTodayDate();

    if (!raw) {
        return { dateDay: today, startedToday: 0 };
    }

    try {
        const parsed = JSON.parse(raw);
        if (parsed?.dateDay === today) {
            return {
                dateDay: today,
                startedToday: Number(parsed?.startedToday || 0),
            };
        }
    } catch {
        // ignore broken KV payload
    }

    return { dateDay: today, startedToday: 0 };
}

async function incrementDailyState(kv, userId) {
    if (!kv) return;
    const current = await getDailyState(kv, userId);
    const next = {
        dateDay: getTodayDate(),
        startedToday: Number(current.startedToday || 0) + 1,
    };
    await kv.put(`${STORY_DAILY_PREFIX}${userId}`, JSON.stringify(next), {
        expirationTtl: STORY_SESSION_TTL_SECONDS,
    });
}

function getTodayDate() {
    return new Date().toISOString().slice(0, 10);
}

async function getStorySession(kv, userId) {
    if (!kv) return null;
    const raw = await kv.get(`${STORY_SESSION_PREFIX}${userId}`);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

async function saveStorySession(kv, userId, session) {
    if (!kv) return;
    await kv.put(`${STORY_SESSION_PREFIX}${userId}`, JSON.stringify(session), {
        expirationTtl: STORY_SESSION_TTL_SECONDS,
    });
}

async function clearStorySession(kv, userId) {
    if (!kv) return;
    await kv.delete(`${STORY_SESSION_PREFIX}${userId}`);
}

async function ensureStoryTables(db) {
    if (!db) return;

    await db
        .prepare(`
      CREATE TABLE IF NOT EXISTS story_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL UNIQUE,
        vk_id BIGINT NOT NULL,
        genre_code TEXT NOT NULL,
        genre_title TEXT NOT NULL,
        level_bucket INTEGER NOT NULL,
        style_code TEXT NOT NULL,
        total_steps INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP
      )
    `)
        .run();

    await db.prepare('CREATE INDEX IF NOT EXISTS idx_story_sessions_vk_id_started ON story_sessions(vk_id, started_at)').run();
}

async function insertStorySessionStart(db, userId, session) {
    if (!db) return;
    await db
        .prepare(`
      INSERT INTO story_sessions (session_id, vk_id, genre_code, genre_title, level_bucket, style_code, total_steps, status, started_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)
        .bind(session.sessionId, userId, session.genreCode, session.genreTitle, session.level, session.styleCode, session.stepCount)
        .run();
}

async function updateStorySessionStep(db, userId, session) {
    if (!db) return;
    await db
        .prepare(`
      UPDATE story_sessions
      SET total_steps = ?, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = ? AND vk_id = ?
    `)
        .bind(session.stepCount, session.sessionId, userId)
        .run();
}

async function completeStorySession(db, userId, session, status) {
    if (!db || !session?.sessionId) return;
    await db
        .prepare(`
      UPDATE story_sessions
      SET status = ?, total_steps = ?, finished_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = ? AND vk_id = ?
    `)
        .bind(status, session.stepCount, session.sessionId, userId)
        .run();
}

async function generateStoryStep({ apiKey, genre, level, styleCode, previousScene, selectedChoice, stepCount }) {
    if (!apiKey) {
        return fallbackStoryStep({ genreTitle: genre.title, stepCount });
    }

    const levelRule = level <= 1
        ? 'Use very simple A1-A2 English. 2-3 short sentences. Avoid idioms and complex grammar.'
        : level === 2
            ? 'Use A2-B1 vocabulary. 3-4 concise sentences. Keep structure clear.'
            : 'Use B1-B2 vocabulary. 4-5 concise sentences. Keep readability high.';

    const styleRule = styleCode === 'oxford_professor'
        ? 'Tone: structured and thoughtful, like a supportive Oxford professor.'
        : styleCode === 'future_traveler'
            ? 'Tone: adventurous and optimistic, like a friendly traveler from the future.'
            : 'Tone: friendly and simple, like a supportive close friend.';

    const continuationRule = stepCount <= 0
        ? 'Start a new story scene with a clear hook.'
        : `Continue from previous scene and chosen branch. Previous scene: ${previousScene}\nChosen branch: ${selectedChoice}`;

    const systemPrompt = `You generate interactive English learning stories.

RULES:
- Genre: ${genre.title}.
- ${levelRule}
- ${styleRule}
- Level constraints are stronger than style.
- Output must be JSON only.
- The scene must be in English.
- Also provide full Russian translation of the scene.
- Provide exactly 3 branch choices in English.
- Each choice must be short (max 70 chars) and clearly different.
- Avoid violence, sexual content, and hate.

STORY CONTEXT:
${continuationRule}

JSON CONTRACT:
{
  "scene_en": "...",
  "scene_ru": "...",
  "choices": ["...", "...", "..."]
}`;

    try {
        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: 'Generate the next scene and 3 choices.' },
                ],
            }),
        });

        const raw = await response.text();
        let data = null;
        try {
            data = JSON.parse(raw);
        } catch {
            return fallbackStoryStep({ genreTitle: genre.title, stepCount });
        }

        if (!response.ok || data?.error) {
            return fallbackStoryStep({ genreTitle: genre.title, stepCount });
        }

        let parsed = null;
        try {
            parsed = JSON.parse(String(data?.choices?.[0]?.message?.content || '{}'));
        } catch {
            parsed = null;
        }

        const sceneEn = String(parsed?.scene_en || '').trim();
        const sceneRu = String(parsed?.scene_ru || '').trim();
        const choices = Array.isArray(parsed?.choices) ? parsed.choices.map((item) => String(item || '').trim()).filter(Boolean) : [];

        if (!sceneEn || !sceneRu || choices.length < 3) {
            return fallbackStoryStep({ genreTitle: genre.title, stepCount });
        }

        return {
            sceneEn,
            sceneRu,
            choices: choices.slice(0, 3),
        };
    } catch {
        return fallbackStoryStep({ genreTitle: genre.title, stepCount });
    }
}

function fallbackStoryStep({ genreTitle, stepCount }) {
    const intro = stepCount <= 0
        ? `In this ${genreTitle.toLowerCase()} story, you open an old door and hear a quiet sound behind it.`
        : `You move forward carefully and notice a new clue in front of you.`;

    return {
        sceneEn: `${intro} What do you do next?`,
        sceneRu: 'В этой истории ты осторожно двигаешься вперед и замечаешь новую подсказку. Что ты сделаешь дальше?',
        choices: [
            'Look around slowly',
            'Ask for help politely',
            'Take one brave step forward',
        ],
    };
}
