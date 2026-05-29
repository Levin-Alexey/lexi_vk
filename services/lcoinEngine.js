import { ensureLcoinTables } from './lcoinTables.js';

const LCOIN_REWARD_AMOUNT = 10;

const METRIC_RULES = {
  text_msg: { threshold: 100, reason: 'milestone_text_100' },
  voice_msg: { threshold: 30, reason: 'milestone_voice_30' },
};

export async function registerMetricProgress(db, vkId, metricKey) {
  const rule = METRIC_RULES[metricKey];
  if (!db || !rule || !Number.isInteger(vkId) || vkId <= 0) {
    return { ok: false, earned: 0, metricKey };
  }

  await ensureLcoinTables(db);

  const current = await db
    .prepare('SELECT total_count, rewarded_milestones FROM user_reward_progress WHERE vk_id = ? AND metric_key = ? LIMIT 1')
    .bind(vkId, metricKey)
    .first();

  const previousTotal = Number(current?.total_count || 0);
  const previousRewardedMilestones = Number(current?.rewarded_milestones || 0);
  const nextTotal = previousTotal + 1;
  const nextRewardedMilestones = Math.floor(nextTotal / rule.threshold);
  const newlyEarnedMilestones = Math.max(0, nextRewardedMilestones - previousRewardedMilestones);
  const earned = newlyEarnedMilestones * LCOIN_REWARD_AMOUNT;

  await db
    .prepare(`
      INSERT INTO user_reward_progress (vk_id, metric_key, total_count, rewarded_milestones, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(vk_id, metric_key)
      DO UPDATE SET
        total_count = excluded.total_count,
        rewarded_milestones = excluded.rewarded_milestones,
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(vkId, metricKey, nextTotal, nextRewardedMilestones)
    .run();

  if (earned > 0) {
    await db.prepare('INSERT OR IGNORE INTO user_balances (vk_id, balance) VALUES (?, 0)').bind(vkId).run();

    await db
      .prepare('INSERT INTO coin_transactions (vk_id, amount, transaction_type, reason) VALUES (?, ?, ?, ?)')
      .bind(vkId, earned, 'earn', rule.reason)
      .run();

    await db
      .prepare('UPDATE user_balances SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE vk_id = ?')
      .bind(earned, vkId)
      .run();
  }

  return {
    ok: true,
    metricKey,
    threshold: rule.threshold,
    totalCount: nextTotal,
    earned,
    newlyEarnedMilestones,
  };
}
