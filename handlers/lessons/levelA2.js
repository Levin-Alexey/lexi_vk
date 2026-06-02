import { sendVkMessage } from '../../services/vkApi.js';

const PAYLOAD_VERSION = 1;
const LESSON_A2_COMMAND = 'lesson_a2';

export function lessonA2Payload() {
  return JSON.stringify({ v: PAYLOAD_VERSION, c: LESSON_A2_COMMAND });
}

export function isLessonA2Command(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === LESSON_A2_COMMAND;
}

export async function handleLessonA2({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: 'Модуль A2 скоро появится. Здесь будут разговорные шаблоны и практические упражнения.',
  });
}
