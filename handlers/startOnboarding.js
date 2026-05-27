import { sendVkMessage } from '../services/vkApi.js';

export async function handleStartOnboarding({ userId, groupId, token }) {
  // TODO этап 2: здесь будет цепочка из 3 блоков вопросов и запись ответов в D1.
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: 'Отлично, начинаем. Следующим этапом добавим 3 блока вопросов и персональный старт.',
  });
}
