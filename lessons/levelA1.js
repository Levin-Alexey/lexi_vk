import { A1_LESSONS } from './A1/a1-lessons.js';
import { LESSON_A1_COMMAND } from './lexiLessons.js';
import { isLessonCommand, sendLessonList } from './_shared.js';

export function isLessonA1Command(payload) {
  return isLessonCommand(payload, LESSON_A1_COMMAND);
}

export async function handleLessonA1({ userId, groupId, token }) {
  return sendLessonList({
    userId,
    groupId,
    token,
    title: 'Уровень A1',
    description: 'Базовые уроки для старта.',
    lessons: A1_LESSONS,
  });
}