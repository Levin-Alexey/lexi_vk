import { sendVkMessage } from '../../services/vkApi.js';

const PAYLOAD_VERSION = 1;
const LESSON_C1_COMMAND = 'lesson_c1';

export function lessonC1Payload() {
  return JSON.stringify({ v: PAYLOAD_VERSION, c: LESSON_C1_COMMAND });
}

export function isLessonC1Command(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === LESSON_C1_COMMAND;
}

export async function handleLessonC1({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: 'Модуль C1 скоро появится. Здесь будет сложная лексика и академический стиль.',
  });
}
