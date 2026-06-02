import { sendVkMessage } from '../../services/vkApi.js';

const PAYLOAD_VERSION = 1;
const LESSON_B2_COMMAND = 'lesson_b2';

export function lessonB2Payload() {
  return JSON.stringify({ v: PAYLOAD_VERSION, c: LESSON_B2_COMMAND });
}

export function isLessonB2Command(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === LESSON_B2_COMMAND;
}

export async function handleLessonB2({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: 'Модуль B2 скоро появится. Здесь будут продвинутые темы, тексты и кейсы.',
  });
}
