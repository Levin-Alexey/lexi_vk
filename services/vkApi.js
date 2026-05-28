const VK_API_VERSION = '5.199';

async function callVkMethod(method, token, params) {
  const url = new URL(`https://api.vk.com/method/${method}`);
  url.searchParams.append('access_token', token);
  url.searchParams.append('v', VK_API_VERSION);

  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'object') {
      url.searchParams.append(key, JSON.stringify(value));
    } else {
      url.searchParams.append(key, String(value));
    }
  }

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    console.error('[VK_ERROR]', method, data.error.error_msg || JSON.stringify(data.error));
    return { ok: false, error: data.error };
  }

  return { ok: true, response: data.response };
}

export async function sendVkMessage({ userId, groupId, token, message, keyboard, attachment }) {
  const result = await callVkMethod('messages.send', token, {
    user_id: userId,
    group_id: groupId,
    message,
    keyboard,
    attachment,
    random_id: Date.now(),
  });

  if (!result.ok) {
    return result;
  }

  return { ok: true, messageId: result.response };
}

export async function editVkMessage({ token, peerId, conversationMessageId, message, keyboard, attachment }) {
  const result = await callVkMethod('messages.edit', token, {
    peer_id: peerId,
    conversation_message_id: conversationMessageId,
    message,
    keyboard,
    attachment,
    keep_forward_messages: 1,
    keep_snippets: 1,
  });

  if (!result.ok) {
    return result;
  }

  return { ok: true, edited: Boolean(result.response) };
}

export async function answerVkMessageEvent({ token, eventId, userId, peerId, text }) {
  if (!eventId || !userId || !peerId) {
    return { ok: true, skipped: true };
  }

  const eventData = text
    ? {
        type: 'show_snackbar',
        text,
      }
    : undefined;

  const result = await callVkMethod('messages.sendMessageEventAnswer', token, {
    event_id: eventId,
    user_id: userId,
    peer_id: peerId,
    event_data: eventData,
  });

  if (!result.ok) {
    return result;
  }

  return { ok: true };
}

export async function setVkTypingActivity({ token, peerId }) {
  if (!peerId) {
    return { ok: true, skipped: true };
  }

  const result = await callVkMethod('messages.setActivity', token, {
    peer_id: peerId,
    type: 'typing',
  });

  if (!result.ok) {
    return result;
  }

  return { ok: true };
}
