import { sendVkMessage } from '../../services/vkApi.js';
import { lessonA1Payload } from './levelA1.js';
import { lessonA2Payload } from './levelA2.js';
import { lessonB1Payload } from './levelB1.js';
import { lessonB2Payload } from './levelB2.js';
import { lessonC1Payload } from './levelC1.js';

const PAYLOAD_VERSION = 1;
const LEXI_LESSONS_COMMAND = 'lexi_lessons';
const LESSONS_PHOTO_ATTACHMENT = 'photo175946972_457239742_30f9f510a78bc08515';

export function lexiLessonsPayload() {
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    c: LEXI_LESSONS_COMMAND,
  });
}

export function isLexiLessonsCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === LEXI_LESSONS_COMMAND;
}

const lessonsKeyboard = {
  inline: true,
  buttons: [
    [{ action: { type: 'callback', label: 'Уровень A1', payload: lessonA1Payload() }, color: 'primary' }],
    [{ action: { type: 'callback', label: 'Уровень A2', payload: lessonA2Payload() }, color: 'primary' }],
    [{ action: { type: 'callback', label: 'Уровень B1', payload: lessonB1Payload() }, color: 'primary' }],
    [{ action: { type: 'callback', label: 'Уровень B2', payload: lessonB2Payload() }, color: 'primary' }],
    [{ action: { type: 'callback', label: 'Уровень C1', payload: lessonC1Payload() }, color: 'primary' }],
  ],
};

export async function handleLexiLessons({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    attachment: LESSONS_PHOTO_ATTACHMENT,
    message: [
      'Английский по шагам 📚✨',
      '',
      'Здесь собраны учебные модули Lexi, которые помогут Вам постепенно прокачивать английский - от простых тем до уверенного общения.',
      '',
      'Выбирайте свой уровень, проходите темы по шагам, изучайте грамматику, разбирайте примеры, читайте короткие тексты и выполняйте практические задания.',
      '',
      'Lexi будет рядом на каждом этапе: объяснит сложное простыми словами, поможет закрепить материал и превратить знания в реальный навык.',
      '',
      'Выберите модуль и начните движение к свободному английскому.',
    ].join('\n'),
    keyboard: lessonsKeyboard,
  });
}
