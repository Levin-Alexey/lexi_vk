const DONUT_EVENT_ACTIONS = {
  donut_subscription_create: 'create',
  donut_subscription_prolonged: 'prolonged',
  donut_subscription_expired: 'expired',
  donut_subscription_cancelled: 'cancelled',
  donut_subscription_price_changed: 'price_changed',
};

export function isDonutEvent(eventType) {
  return Boolean(DONUT_EVENT_ACTIONS[eventType]);
}

export async function handleDonutEvent(payload, env) {
  const eventType = payload?.type;
  const action = DONUT_EVENT_ACTIONS[eventType];

  if (!action) {
    return { ok: false, reason: 'unsupported_event_type' };
  }

  const eventObject = payload?.object || {};
  const vkId = Number(eventObject.user_id);

  if (!Number.isInteger(vkId) || vkId <= 0) {
    console.error('[DONUT_ERROR] user_id отсутствует или невалиден:', JSON.stringify(eventObject));
    return { ok: false, reason: 'invalid_user_id' };
  }

  await ensureDonutLogsTable(env.DB);
  const amountColumn = await resolveAmountColumn(env.DB);

  // Пользователь может оформить подписку до первого сообщения боту.
  await env.DB.prepare('INSERT OR IGNORE INTO users_vk (vk_id) VALUES (?)').bind(vkId).run();

  const amount = resolveDonutAmount(eventType, eventObject);

  await env.DB
    .prepare(`INSERT INTO donut_logs (vk_id, action, ${amountColumn}) VALUES (?, ?, ?)`)
    .bind(vkId, action, amount)
    .run();

  await applySubscriptionState(env.DB, vkId, action, amount);

  console.log(`[DONUT] event=${eventType}, action=${action}, vk_id=${vkId}, amount=${amount}`);
  return { ok: true };
}

// Determines the subscription tier based on the paid amount.
// Prices: tier1 = 149₽, tier2 = 249₽, tier3 = 349₽.
function resolveDonutTier(amount) {
  if (amount <= 200) return 'tier1';
  if (amount <= 300) return 'tier2';
  return 'tier3';
}

async function applySubscriptionState(db, vkId, action, amount) {
  if (action === 'create' || action === 'prolonged') {
    const tier = resolveDonutTier(amount);
    await db
      .prepare("UPDATE users_vk SET subscription_tier = ?, subscription_until = DATETIME('now', '+30 day') WHERE vk_id = ?")
      .bind(tier, vkId)
      .run();
    return;
  }

  if (action === 'expired') {
    await db
      .prepare("UPDATE users_vk SET subscription_tier = 'free', subscription_until = DATETIME('now') WHERE vk_id = ?")
      .bind(vkId)
      .run();
    return;
  }

  // cancelled/price_changed — keep current tier; access is decided by donut_logs windows.
}

function resolveDonutAmount(eventType, eventObject) {
  if (eventType === 'donut_subscription_create' || eventType === 'donut_subscription_prolonged') {
    return normalizeAmount(eventObject.amount);
  }

  if (eventType === 'donut_subscription_price_changed') {
    return normalizeAmount(eventObject.amount_new ?? eventObject.amount_old ?? eventObject.amount_diff);
  }

  return 0;
}

function normalizeAmount(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return 0;
  }
  return Math.round(numberValue);
}

async function ensureDonutLogsTable(db) {
  if (!db) {
    console.error('[D1_ERROR] DB binding отсутствует при работе с donut_logs');
    return;
  }

  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS donut_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vk_id BIGINT NOT NULL,
        action TEXT NOT NULL,
        amount INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vk_id) REFERENCES users_vk(vk_id)
      )
    `)
    .run();
}

async function resolveAmountColumn(db) {
  const tableInfo = await db.prepare('PRAGMA table_info(donut_logs)').all();
  const columns = (tableInfo.results || []).map((column) => column.name);

  if (columns.includes('amount')) {
    return 'amount';
  }

  // Совместимость с ранее созданной ошибочной схемой: колонка named 'cancelled'.
  if (columns.includes('cancelled')) {
    return 'cancelled';
  }

  await db.prepare('ALTER TABLE donut_logs ADD COLUMN amount INTEGER NOT NULL DEFAULT 0').run();
  return 'amount';
}
