export async function sendVkMessage({ userId, groupId, token, message, keyboard, attachment }) {
  const url = new URL('https://api.vk.com/method/messages.send');

  url.searchParams.append('user_id', String(userId));
  url.searchParams.append('group_id', String(groupId));
  url.searchParams.append('message', message);
  url.searchParams.append('random_id', String(Date.now()));
  url.searchParams.append('access_token', token);
  url.searchParams.append('v', '5.199');

  if (keyboard) {
    url.searchParams.append('keyboard', JSON.stringify(keyboard));
  }

  if (attachment) {
    url.searchParams.append('attachment', attachment);
  }

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    console.error('[VK_ERROR]', data.error.error_msg || JSON.stringify(data.error));
    return { ok: false, error: data.error };
  }

  return { ok: true, messageId: data.response };
}
