import { A1_LESSONS } from './A1/a1-lessons.js';
import { LESSON_A1_COMMAND } from './lexiLessons.js';
import { isLessonCommand, lessonPayload } from './_shared.js';
import { sendVkMessage } from '../services/vkApi.js';
import {
  ensureLessonsTables,
  getCompletedLessonIds,
  getLessonSteps,
  getLessonsByLevel,
  upsertLessonProgress,
} from '../services/lessonsService.js';

const LESSON_A1_OPEN_COMMAND = 'lesson_a1_open';
const LESSON_A1_PAGE_COMMAND = 'lesson_a1_page';
const LESSON_A1_STEP_COMMAND = 'la1s';
const LESSON_A1_ANS_COMMAND = 'la1a';
const LESSON_A1_COMPLETE_COMMAND = 'la1c';

const LESSONS_PER_PAGE = 8;
const LESSON_BUTTONS_PER_ROW = 2;
const MAX_BTN = 40;

export function isLessonA1Command(payload) {
  return isLessonCommand(payload, LESSON_A1_COMMAND);
}

export function isLessonA1OpenCommand(payload) {
  return isLessonCommand(payload, LESSON_A1_OPEN_COMMAND) && Number.isFinite(Number(payload?.d));
}

export function isLessonA1PageCommand(payload) {
  return isLessonCommand(payload, LESSON_A1_PAGE_COMMAND) && Number.isFinite(Number(payload?.d));
}

export function isLessonA1StepCommand(payload) {
  return isLessonCommand(payload, LESSON_A1_STEP_COMMAND)
    && Number.isFinite(Number(payload?.d?.l))
    && Number.isFinite(Number(payload?.d?.s));
}

export function isLessonA1AnsCommand(payload) {
  return isLessonCommand(payload, LESSON_A1_ANS_COMMAND)
    && Number.isFinite(Number(payload?.d?.l))
    && Number.isFinite(Number(payload?.d?.s))
    && typeof payload?.d?.a === 'string';
}

export function isLessonA1CompleteCommand(payload) {
  return isLessonCommand(payload, LESSON_A1_COMPLETE_COMMAND)
    && Number.isFinite(Number(payload?.d?.l));
}

async function loadA1Lessons(env) {
  let lessons = A1_LESSONS;

  try {
    if (env?.DB) {
      await ensureLessonsTables(env.DB);
      const dbLessons = await getLessonsByLevel(env.DB, 1);
      if (dbLessons.length > 0) {
        lessons = dbLessons;
      }
    }
  } catch (error) {
    console.error('[LESSONS] Ошибка чтения A1 из D1, используем lessons из файлов:', error);
  }

  return lessons;
}

function getPageOffsetForLesson(lessons, lessonId) {
  const lessonIndex = lessons.findIndex((lesson) => Number(lesson.id) === Number(lessonId));
  if (lessonIndex < 0) {
    return 0;
  }

  return Math.floor(lessonIndex / LESSONS_PER_PAGE) * LESSONS_PER_PAGE;
}

function chunkButtons(items, size) {
  const rows = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

function normalizeOffset(offset, total) {
  const safe = Number.isFinite(offset) ? Math.max(0, offset) : 0;
  return safe >= total ? Math.max(0, total - LESSONS_PER_PAGE) : safe;
}

function trunc(str, max) {
  const s = String(str || '');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function buildA1Keyboard(pageLessons, offset, total) {
  const btns = pageLessons.map((lesson) => ({
    action: {
      type: 'callback',
      label: `${lesson.order_num}`,
      payload: lessonPayload(LESSON_A1_OPEN_COMMAND, Number(lesson.id)),
    },
    color: 'primary',
  }));

  const rows = chunkButtons(btns, LESSON_BUTTONS_PER_ROW);
  const nav = [];

  if (offset > 0) {
    nav.push({
      action: { type: 'callback', label: '⬅️ Назад', payload: lessonPayload(LESSON_A1_PAGE_COMMAND, Math.max(0, offset - LESSONS_PER_PAGE)) },
      color: 'secondary',
    });
  }

  if (offset + LESSONS_PER_PAGE < total) {
    nav.push({
      action: { type: 'callback', label: 'Дальше ➡️', payload: lessonPayload(LESSON_A1_PAGE_COMMAND, offset + LESSONS_PER_PAGE) },
      color: 'secondary',
    });
  }

  if (nav.length > 0) rows.push(nav);

  return { inline: true, buttons: rows };
}

async function loadStepsForLesson(env, lessonId, lesson) {
  if (Array.isArray(lesson?.steps) && lesson.steps.length > 0) {
    return lesson.steps;
  }
  if (env?.DB) {
    try {
      const steps = await getLessonSteps(env.DB, lessonId);
      if (steps.length > 0) return steps;
    } catch (error) {
      console.error('[LESSONS] Ошибка чтения шагов из D1:', error);
    }
  }
  return [];
}

function sortedSteps(steps) {
  return [...steps].sort((a, b) => Number(a.order_num) - Number(b.order_num));
}

function renderTheoryStep({ userId, groupId, token, lessonId, step, nextStep }) {
  const text = step.content?.text || '';
  const attachment = step.content?.vk_attachment || undefined;
  const btnLabel = trunc(step.content?.button_text || 'Дальше ➡️', MAX_BTN);

  const nextPay = nextStep
    ? lessonPayload(LESSON_A1_STEP_COMMAND, { l: lessonId, s: Number(nextStep.order_num) })
    : lessonPayload(LESSON_A1_COMPLETE_COMMAND, { l: lessonId });
  const nextLabel = nextStep ? btnLabel : '🏁 Урок завершён!';
  const nextColor = nextStep ? 'primary' : 'positive';

  return sendVkMessage({
    userId,
    groupId,
    token,
    message: text,
    attachment,
    keyboard: {
      inline: true,
      buttons: [[{ action: { type: 'callback', label: nextLabel, payload: nextPay }, color: nextColor }]],
    },
  });
}

function renderQuizStep({ userId, groupId, token, lessonId, step }) {
  const { question, options } = step.content || {};
  const stepNum = Number(step.order_num);

  const optionRows = (Array.isArray(options) ? options : []).map((opt) => [{
    action: {
      type: 'callback',
      label: trunc(opt.text, MAX_BTN),
      payload: lessonPayload(LESSON_A1_ANS_COMMAND, { l: lessonId, s: stepNum, a: opt.id }),
    },
    color: 'secondary',
  }]);

  return sendVkMessage({
    userId,
    groupId,
    token,
    message: question || 'Выберите ответ:',
    keyboard: { inline: true, buttons: optionRows },
  });
}

async function sendA1LessonsPage({ userId, groupId, token, env, offset = 0 }) {
  const allLessons = await loadA1Lessons(env);
  const safeOffset = normalizeOffset(Number(offset), allLessons.length);
  const pageLessons = allLessons.slice(safeOffset, safeOffset + LESSONS_PER_PAGE);

  let completedIds = new Set();
  if (env?.DB) {
    try {
      completedIds = await getCompletedLessonIds(env.DB, userId, allLessons.map((lesson) => Number(lesson.id)));
    } catch (error) {
      console.error('[LESSONS] Ошибка чтения прогресса уроков:', error);
    }
  }

  const lines = pageLessons.map((lesson) => {
    const marker = completedIds.has(Number(lesson.id)) ? '✅' : '▫️';
    return `${marker} Урок ${lesson.order_num}. ${lesson.title}`;
  });

  const pageNumber = Math.floor(safeOffset / LESSONS_PER_PAGE) + 1;
  const totalPages = Math.max(1, Math.ceil(allLessons.length / LESSONS_PER_PAGE));

  return sendVkMessage({
    userId,
    groupId,
    token,
    message: ['Уровень A1', `Страница ${pageNumber} из ${totalPages}. Нажмите номер урока.`, '', ...lines].join('\n'),
    keyboard: buildA1Keyboard(pageLessons, safeOffset, allLessons.length),
  });
}

export async function handleLessonA1({ userId, groupId, token, env }) {
  return sendA1LessonsPage({ userId, groupId, token, env, offset: 0 });
}

export async function handleLessonA1Page({ userId, groupId, token, env, payload }) {
  return sendA1LessonsPage({ userId, groupId, token, env, offset: Number(payload?.d) || 0 });
}

export async function handleLessonA1Open({ userId, groupId, token, env, payload }) {
  const lessonId = Number(payload?.d);
  const allLessons = await loadA1Lessons(env);
  const lesson = allLessons.find((item) => Number(item.id) === lessonId);

  if (!lesson) {
    return sendVkMessage({ userId, groupId, token, message: 'Урок не найден. Откройте A1 заново.' });
  }

  const steps = await loadStepsForLesson(env, lessonId, lesson);

  if (steps.length === 0) {
    return sendVkMessage({ userId, groupId, token, message: 'Содержимое урока ещё не загружено.' });
  }

  const sorted = sortedSteps(steps);
  const firstStep = sorted[0];
  const nextStep = sorted[1] || null;

  if (env?.DB) {
    try {
      await upsertLessonProgress(env.DB, userId, lessonId, Number(firstStep.order_num), 'in_progress');
    } catch (error) {
      console.error('[LESSONS] Ошибка сохранения старта урока:', error);
    }
  }

  if (firstStep.step_type === 'quiz_choice') {
    return renderQuizStep({ userId, groupId, token, lessonId, step: firstStep });
  }

  return renderTheoryStep({ userId, groupId, token, lessonId, step: firstStep, nextStep });
}

export async function handleLessonA1Step({ userId, groupId, token, env, payload }) {
  const { l: lessonId, s: stepOrderNum } = payload?.d || {};
  const allLessons = await loadA1Lessons(env);
  const lesson = allLessons.find((item) => Number(item.id) === Number(lessonId));

  if (!lesson) {
    return sendVkMessage({ userId, groupId, token, message: 'Урок не найден.' });
  }

  const steps = await loadStepsForLesson(env, Number(lessonId), lesson);
  const sorted = sortedSteps(steps);
  const step = sorted.find((s) => Number(s.order_num) === Number(stepOrderNum));

  if (!step) {
    return sendVkMessage({ userId, groupId, token, message: 'Шаг не найден.' });
  }

  const nextStep = sorted.find((s) => Number(s.order_num) > Number(stepOrderNum)) || null;

  if (env?.DB) {
    try {
      await upsertLessonProgress(env.DB, userId, Number(lessonId), Number(stepOrderNum), 'in_progress');
    } catch (error) {
      console.error('[LESSONS] Ошибка сохранения прогресса шага:', error);
    }
  }

  if (step.step_type === 'quiz_choice') {
    return renderQuizStep({ userId, groupId, token, lessonId: Number(lessonId), step });
  }

  return renderTheoryStep({ userId, groupId, token, lessonId: Number(lessonId), step, nextStep });
}

export async function handleLessonA1Ans({ userId, groupId, token, env, payload }) {
  const { l: lessonId, s: stepOrderNum, a: answerId } = payload?.d || {};
  const allLessons = await loadA1Lessons(env);
  const lesson = allLessons.find((item) => Number(item.id) === Number(lessonId));

  if (!lesson) {
    return sendVkMessage({ userId, groupId, token, message: 'Урок не найден.' });
  }

  const steps = await loadStepsForLesson(env, Number(lessonId), lesson);
  const sorted = sortedSteps(steps);
  const step = sorted.find((s) => Number(s.order_num) === Number(stepOrderNum));

  if (!step || step.step_type !== 'quiz_choice') {
    return sendVkMessage({ userId, groupId, token, message: 'Вопрос не найден.' });
  }

  const options = Array.isArray(step.content?.options) ? step.content.options : [];
  const selected = options.find((opt) => opt.id === answerId);
  const isCorrect = selected?.is_correct === true;
  const nextStep = sorted.find((s) => Number(s.order_num) > Number(stepOrderNum)) || null;

  const feedbackText = isCorrect
    ? `✅ Правильно!\n\n${selected.text}`
    : `❌ Не совсем.\n\n${step.content?.explanation_if_wrong || ''}`;

  const nextLabel = nextStep
    ? (nextStep.step_type === 'quiz_choice' ? 'Следующий вопрос ➡️' : 'Дальше ➡️')
    : '🏁 Урок завершён!';
  const nextPay = nextStep
    ? lessonPayload(LESSON_A1_STEP_COMMAND, { l: Number(lessonId), s: Number(nextStep.order_num) })
    : lessonPayload(LESSON_A1_COMPLETE_COMMAND, { l: Number(lessonId) });

  return sendVkMessage({
    userId,
    groupId,
    token,
    message: feedbackText,
    keyboard: {
      inline: true,
      buttons: [[{ action: { type: 'callback', label: nextLabel, payload: nextPay }, color: isCorrect ? 'positive' : 'primary' }]],
    },
  });
}

export async function handleLessonA1Complete({ userId, groupId, token, env, payload }) {
  const lessonId = Number(payload?.d?.l);
  const allLessons = await loadA1Lessons(env);
  const lesson = allLessons.find((item) => Number(item.id) === lessonId);

  if (!lesson) {
    return sendVkMessage({ userId, groupId, token, message: 'Урок не найден.' });
  }

  const steps = await loadStepsForLesson(env, lessonId, lesson);
  const lastStepNum = sortedSteps(steps).at(-1)?.order_num || 1;

  if (env?.DB) {
    try {
      await upsertLessonProgress(env.DB, userId, lessonId, Number(lastStepNum), 'completed');
    } catch (error) {
      console.error('[LESSONS] Ошибка завершения урока:', error);
    }
  }

  const offset = getPageOffsetForLesson(allLessons, lessonId);
  return sendA1LessonsPage({ userId, groupId, token, env, offset });
}