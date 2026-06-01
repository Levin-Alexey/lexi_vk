import { processTextQueueMessage } from '../services/textDialog.js';
import { processVoiceQueueMessage } from '../services/voiceDialog.js';
import { processDictionaryQueueMessage } from '../services/dictionaryService.js';

export async function handleQueueBatch(batch, env, ctx) {
  console.log(`[QUEUE] Получен batch из очереди ${batch.queue}, messages=${batch.messages.length}`);

  for (const message of batch.messages) {
    try {
      await handleQueueMessage(batch.queue, message.body, env, ctx, message.id);
    } catch (error) {
      console.error('[QUEUE_ERROR]', batch.queue, message.id, error);
      throw error;
    }
  }
}

async function handleQueueMessage(queueName, body, env, ctx, messageId) {
  if (queueName === 'voice-tasks') {
    return processVoiceQueueMessage(body, env);
  }

  if (queueName === 'text-tasks') {
    return processTextQueueMessage(body, env);
  }

  if (queueName === 'dictionary-tasks') {
    return processDictionaryQueueMessage(body, env);
  }

  console.log('[QUEUE][UNKNOWN]', queueName, messageId, JSON.stringify(body));
}
