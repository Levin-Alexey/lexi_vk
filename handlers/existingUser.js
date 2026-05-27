import { sendVkMessage } from '../services/vkApi.js';

const RETURNING_USER_PHOTO_ATTACHMENT = 'photo175946972_457239739_27eedd46884c68f160';

export async function handleExistingUser({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    attachment: RETURNING_USER_PHOTO_ATTACHMENT,
    message: 'Тут будет описание',
  });
}
