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

export async function sendVkVoiceMessageFromMp3({ userId, groupId, token, mp3Bytes, message, mimeType = 'audio/mpeg', fileName = 'lexi-response.mp3' }) {
  const uploadResult = await callVkMethod('docs.getMessagesUploadServer', token, {
    type: 'audio_message',
    peer_id: userId,
  });

  if (!uploadResult.ok || !uploadResult.response?.upload_url) {
    return { ok: false, error: uploadResult.error || 'upload_server_unavailable' };
  }

  const formData = new FormData();
  formData.append('file', new Blob([mp3Bytes], { type: mimeType }), fileName);

  const uploadResponse = await fetch(uploadResult.response.upload_url, {
    method: 'POST',
    body: formData,
  });

  const uploadData = await uploadResponse.json();
  if (!uploadResponse.ok || uploadData?.error || !uploadData?.file) {
    console.error('[VK_ERROR] docs upload failed', JSON.stringify(uploadData));
    return { ok: false, error: uploadData?.error || 'upload_failed' };
  }

  const saveResult = await callVkMethod('docs.save', token, {
    file: uploadData.file,
    title: 'Lexi Voice Response',
  });

  if (!saveResult.ok) {
    return saveResult;
  }

  const savedDoc = extractSavedDoc(saveResult.response);
  if (!savedDoc?.owner_id || !savedDoc?.id) {
    console.error('[VK_ERROR] docs.save returned unsupported response shape', JSON.stringify(saveResult.response));
    return { ok: false, error: 'invalid_doc_response' };
  }

  const accessKeyPart = savedDoc.access_key ? `_${savedDoc.access_key}` : '';
  const attachment = `doc${savedDoc.owner_id}_${savedDoc.id}${accessKeyPart}`;

  return sendVkMessage({
    userId,
    groupId,
    token,
    message,
    attachment,
  });
}

function extractSavedDoc(response) {
  const first = Array.isArray(response) ? response[0] : response;
  if (!first || typeof first !== 'object') {
    return null;
  }

  if (first.owner_id && first.id) {
    return {
      owner_id: first.owner_id,
      id: first.id,
      access_key: first.access_key,
    };
  }

  const nestedCandidates = [first.doc, first.audio_message, first.audio, first.message_audio, first.saved];
  for (const candidate of nestedCandidates) {
    if (candidate?.owner_id && candidate?.id) {
      return {
        owner_id: candidate.owner_id,
        id: candidate.id,
        access_key: candidate.access_key,
      };
    }
  }

  if (first.preview?.audio_msg && first.owner_id && first.id) {
    return {
      owner_id: first.owner_id,
      id: first.id,
      access_key: first.access_key,
    };
  }

  return null;
}
