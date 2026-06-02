import { sendVkMessage } from '../../services/vkApi.js';

const PAYLOAD_VERSION = 1;
const LESSON_B1_COMMAND = 'lesson_b1';

export function lessonB1Payload() {
  return JSON.stringify({ v: PAYLOAD_VERSION, c: LESSON_B1_COMMAND });
}

export function isLessonB1Command(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === LESSON_B1_COMMAND;
}

export async function handleLessonB1({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: 'Модуль B1 скоро появится. Здесь будут темы для уверенного повседневного общения.',
  });
}
