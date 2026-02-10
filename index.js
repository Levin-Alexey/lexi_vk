/**
 * Welcome to Cloudflare Workers! This is your first worker.
 */

export default {
  async fetch(request, env) {
    console.log('[RECV] Входящий запрос:', request.method, request.url);

    if (request.method !== 'POST') {
      console.log('[REJECT] Не POST запрос');
      return new Response('Method Not Allowed', { status: 405 });
    }

    let payload = null;
    try {
      payload = await request.json();
      console.log('[RECV] JSON payload:', JSON.stringify(payload));
    } catch (error) {
      console.log('[ERROR] Не валидный JSON:', error);
      return new Response('Bad Request', { status: 400 });
    }

    // Проверка secret — ВК отправляет в параметрах URL, не в body
    // Пока пропускаем, позже добавим правильную проверку
    console.log('[INFO] Проверка безопасности пропущена (добавим позже)');

    if (payload.type === 'confirmation') {
      console.log('[CONFIRM] Отправляем confirmation');
      return new Response('02c2fafa', {
        status: 200,
        headers: {
          'content-type': 'text/plain',
        },
      });
    }

    // Обработка события message_new
    if (payload.type === 'message_new') {
      const message = payload.object.message;
      const userId = message.from_id;
      const text = message.text;
      const groupId = payload.group_id;

      console.log(`[MESSAGE] От ${userId}: "${text}"`);
      console.log(`[TOKEN] VK_TOKEN установлен: ${env.VK_TOKEN ? 'ДА' : 'НЕТ'}`);

      // Если команда "очистить" - убираем клавиатуру
      if (text.toLowerCase() === 'очистить' || text.toLowerCase() === 'clear') {
        await clearKeyboard(userId, 'Клавиатура удалена', env.VK_TOKEN, groupId);
      } else {
        // Отправляем эхо-ответ с inline кнопками
        await sendMessage(userId, text, env.VK_TOKEN, groupId);
      }
    }

    return new Response('ok', {
      status: 200,
      headers: {
        'content-type': 'text/plain',
      },
    });
  },
};

// Функция для отправки сообщения через VK API
async function sendMessage(userId, text, token, groupId) {
  const inlineKeyboard = {
    inline: true,
    buttons: [[
      {
        action: {
          type: 'callback',
          label: 'Кнопка 11',
          payload: '{"button": 1}'
        }
      },
      {
        action: {
          type: 'callback',
          label: 'Кнопка 22',
          payload: '{"button": 2}'
        }
      }
    ]]
  };

  const url = new URL('https://api.vk.com/method/messages.send');
  url.searchParams.append('user_id', userId);
  url.searchParams.append('message', text);
  url.searchParams.append('keyboard', JSON.stringify(inlineKeyboard));
  url.searchParams.append('random_id', Date.now());
  url.searchParams.append('group_id', groupId);
  url.searchParams.append('access_token', token);
  url.searchParams.append('v', '5.199');

  console.log(`[SEND] Отправляем: user=${userId}, message="${text}"`);

  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    
    console.log('[VK_RESPONSE]', JSON.stringify(data));
    
    if (data.error) {
      console.error('[VK_ERROR]', data.error.error_msg || data.error);
      return { error: data.error };
    }
    
    console.log('[SUCCESS] Message ID:', data.response);
    return { success: true, messageId: data.response };
  } catch (error) {
    console.error('[FETCH_ERROR]', error.message);
    return { error: error.message };
  }
}

// Функция для отправки сообщения с пустой клавиатурой (удалить старые кнопки)
async function clearKeyboard(userId, text, token, groupId) {
  const emptyKeyboard = {
    buttons: []
  };

  const url = new URL('https://api.vk.com/method/messages.send');
  url.searchParams.append('user_id', userId);
  url.searchParams.append('message', text);
  url.searchParams.append('keyboard', JSON.stringify(emptyKeyboard));
  url.searchParams.append('random_id', Date.now());
  url.searchParams.append('group_id', groupId);
  url.searchParams.append('access_token', token);
  url.searchParams.append('v', '5.199');

  console.log('[CLEAR] Удаляем клавиатуру');

  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    console.log('[CLEAR_RESPONSE]', JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('[CLEAR_ERROR]', error.message);
    return { error: error.message };
  }
}
