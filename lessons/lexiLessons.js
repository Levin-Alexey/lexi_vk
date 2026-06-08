import { sendVkMessage } from '../services/vkApi.js';
import { lessonPayload, isLessonCommand } from './_shared.js';

export const LEXI_LESSONS_COMMAND = 'lexi_lessons';
export const LESSON_A1_COMMAND = 'lesson_a1';
export const LESSON_A2_COMMAND = 'lesson_a2';
export const LESSON_B1_COMMAND = 'lesson_b1';
export const LESSON_B2_COMMAND = 'lesson_b2';
export const LESSON_C1_COMMAND = 'lesson_c1';

const keyboard = {
  inline: true,
  buttons: [
    [{ action: { type: 'callback', label: 'A1', payload: lessonPayload(LESSON_A1_COMMAND) }, color: 'primary' }],
    [{ action: { type: 'callback', label: 'A2', payload: lessonPayload(LESSON_A2_COMMAND) }, color: 'secondary' }],
    [{ action: { type: 'callback', label: 'B1', payload: lessonPayload(LESSON_B1_COMMAND) }, color: 'secondary' }],
    [{ action: { type: 'callback', label: 'B2', payload: lessonPayload(LESSON_B2_COMMAND) }, color: 'secondary' }],
    [{ action: { type: 'callback', label: 'C1', payload: lessonPayload(LESSON_C1_COMMAND) }, color: 'secondary' }],
  ],
};

export function lexiLessonsPayload() {
  return lessonPayload(LEXI_LESSONS_COMMAND);
}

export function isLexiLessonsCommand(payload) {
  return isLessonCommand(payload, LEXI_LESSONS_COMMAND);
}

export async function handleLexiLessons({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: [
      'Английский по шагам',
      'Выберите уровень, чтобы открыть уроки.',
    ].join('\n'),
    keyboard,
  });
}