export async function ensureLcoinTables(db) {
  if (!db) {
    console.error('[D1_ERROR] DB binding отсутствует при работе с LCoin таблицами');
    return;
  }

  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS user_balances (
        vk_id BIGINT PRIMARY KEY,
        balance INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vk_id) REFERENCES users_vk(vk_id)
      )
    `)
    .run();

  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS coin_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vk_id BIGINT NOT NULL,
        amount INTEGER NOT NULL,
        transaction_type TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vk_id) REFERENCES users_vk(vk_id)
      )
    `)
    .run();

  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS user_reward_progress (
        vk_id BIGINT NOT NULL,
        metric_key TEXT NOT NULL,
        total_count INTEGER NOT NULL DEFAULT 0,
        rewarded_milestones INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (vk_id, metric_key),
        FOREIGN KEY (vk_id) REFERENCES users_vk(vk_id)
      )
    `)
    .run();
}
