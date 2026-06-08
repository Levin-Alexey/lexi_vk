import { LESSON_B1_COMMAND } from './lexiLessons.js';
import { isLessonCommand, sendLessonStub } from './_shared.js';

export function isLessonB1Command(payload) {
  return isLessonCommand(payload, LESSON_B1_COMMAND);
}

export async function handleLessonB1({ userId, groupId, token }) {
  return sendLessonStub({ userId, groupId, token, level: 'Уровень B1' });
}