import { LESSON_A2_COMMAND } from './lexiLessons.js';
import { isLessonCommand, sendLessonStub } from './_shared.js';

export function isLessonA2Command(payload) {
  return isLessonCommand(payload, LESSON_A2_COMMAND);
}

export async function handleLessonA2({ userId, groupId, token }) {
  return sendLessonStub({ userId, groupId, token, level: 'Уровень A2' });
}