import { A1_LESSONS } from './A1/a1-lessons.js';
import { LESSON_A1_COMMAND } from './lexiLessons.js';
import { isLessonCommand, sendLessonList } from './_shared.js';
import { ensureLessonsTables, getLessonsByLevel } from '../services/lessonsService.js';

export function isLessonA1Command(payload) {
  return isLessonCommand(payload, LESSON_A1_COMMAND);
}

export async function handleLessonA1({ userId, groupId, token, env }) {
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

  return sendLessonList({
    userId,
    groupId,
    token,
    title: 'Уровень A1',
    description: 'Базовые уроки для старта.',
    lessons,
  });
}