import { LESSON_C1_COMMAND } from './lexiLessons.js';
import { isLessonCommand, sendLessonStub } from './_shared.js';

export function isLessonC1Command(payload) {
  return isLessonCommand(payload, LESSON_C1_COMMAND);
}

export async function handleLessonC1({ userId, groupId, token }) {
  return sendLessonStub({ userId, groupId, token, level: 'Уровень C1' });
}