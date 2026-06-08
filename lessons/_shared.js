import { sendVkMessage } from '../services/vkApi.js';

const PAYLOAD_VERSION = 1;

export function lessonPayload(command) {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: command,
  });
}

export function isLessonCommand(payload, command) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === command;
}

export async function sendLessonList({ userId, groupId, token, title, description, lessons }) {
  const rows = Array.isArray(lessons)
    ? lessons.map((lesson) => {
      const marker = Number(lesson.is_premium) === 1 ? '🔒' : '✅';
      return `${marker} Урок ${lesson.order_num}. ${lesson.title}`;
    })
    : [];

  return sendVkMessage({
    userId,
    groupId,
    token,
    message: [title, description, '', ...rows].join('\n'),
  });
}

export async function sendLessonStub({ userId, groupId, token, level }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: `${level} пока не опубликован. Сейчас доступен раздел A1.`,
  });
}