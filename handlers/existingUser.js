import { sendVkMessage } from '../services/vkApi.js';

const RETURNING_USER_PHOTO_ATTACHMENT = 'photo175946972_457239738_b26e0a395b08e597ed';

export async function handleExistingUser({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    attachment: RETURNING_USER_PHOTO_ATTACHMENT,
    message: 'Тут будет описание',
  });
}
