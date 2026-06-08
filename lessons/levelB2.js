import { LESSON_B2_COMMAND } from './lexiLessons.js';
import { isLessonCommand, sendLessonStub } from './_shared.js';

export function isLessonB2Command(payload) {
  return isLessonCommand(payload, LESSON_B2_COMMAND);
}

export async function handleLessonB2({ userId, groupId, token }) {
  return sendLessonStub({ userId, groupId, token, level: 'Уровень B2' });
}