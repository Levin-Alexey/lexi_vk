import { sendVkMessage } from '../../services/vkApi.js';

const PAYLOAD_VERSION = 1;
const LESSON_A1_COMMAND = 'lesson_a1';

export function lessonA1Payload() {
  return JSON.stringify({ v: PAYLOAD_VERSION, c: LESSON_A1_COMMAND });
}

export function isLessonA1Command(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === LESSON_A1_COMMAND;
}

export async function handleLessonA1({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: 'Модуль A1 скоро появится. Здесь будут базовые темы, лексика и простая грамматика.',
  });
}
