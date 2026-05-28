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
    console.log('[QUEUE][VOICE]', messageId, JSON.stringify(body));
    return;
  }

  if (queueName === 'text-tasks') {
    console.log('[QUEUE][TEXT]', messageId, JSON.stringify(body));
    return;
  }

  console.log('[QUEUE][UNKNOWN]', queueName, messageId, JSON.stringify(body));
}
