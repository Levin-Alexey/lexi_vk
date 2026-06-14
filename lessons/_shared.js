import { sendVkMessage } from '../services/vkApi.js';

const PAYLOAD_VERSION = 1;

export function lessonPayload(command, data) {
  const payload = {
    v: PAYLOAD_VERSION,
    c: command,
  };

  if (data !== undefined) {
    payload.d = data;
  }

  return JSON.stringify(payload);
}

export function isLessonCommand(payload, command) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === command;
}

function chunkButtons(items, size) {
  const rows = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
}

export async function sendLessonList({ userId, groupId, token, title, description, lessons, lessonButtonCommand }) {
  const rows = Array.isArray(lessons)
    ? lessons.map((lesson) => {
      const marker = Number(lesson.is_premium) === 1 ? '🔒' : '✅';
      return `${marker} Урок ${lesson.order_num}. ${lesson.title}`;
    })
    : [];

  const keyboardButtons = Array.isArray(lessons)
    ? lessons.map((lesson) => ({
      action: {
        type: 'callback',
        label: `${lesson.order_num}`,
        payload: lessonPayload(lessonButtonCommand, Number(lesson.id)),
      },
      color: 'primary',
    }))
    : [];

  const keyboardRows = chunkButtons(keyboardButtons, 3);

  return sendVkMessage({
    userId,
    groupId,
    token,
    message: [title, description, '', ...rows].join('\n'),
    keyboard: lessonButtonCommand ? { inline: true, buttons: keyboardRows } : undefined,
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