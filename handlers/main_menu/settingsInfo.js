import { sendVkMessage } from '../../services/vkApi.js';
import { SETTINGS_INFO_BUTTON_TEXT } from './constants.js';

const PAYLOAD_VERSION = 1;
const SETTINGS_MENU_COMMAND = 'settings_info_menu';
const SETTINGS_SUBSCRIPTION_STATUS_COMMAND = 'settings_subscription_status';
const SETTINGS_RETURN_MAIN_MENU_COMMAND = 'settings_return_main_menu';
const SHOW_TARIFFS_COMMAND = 'show_tariffs';

const SETTINGS_SUBSCRIPTION_STATUS_BUTTON_TEXT = '💳 Мой тариф и статус подписки';
const SETTINGS_BACK_MAIN_MENU_BUTTON_TEXT = '🏠 Вернуться в главное меню';

export function isSettingsInfoButtonText(text) {
  return String(text || '').trim() === SETTINGS_INFO_BUTTON_TEXT;
}

export function isSettingsMenuCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === SETTINGS_MENU_COMMAND;
}

export function isSettingsSubscriptionStatusCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === SETTINGS_SUBSCRIPTION_STATUS_COMMAND;
}

export function isSettingsReturnMainMenuCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === SETTINGS_RETURN_MAIN_MENU_COMMAND;
}

export async function handleSettingsInfoMenu({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: [
      '⚙️ Настройки и информация',
      '',
      'Здесь можно смотреть статус подписки и управлять важными параметрами аккаунта.',
      'Выберите раздел ниже.',
    ].join('\n'),
    keyboard: buildSettingsMenuKeyboard(),
  });
}

export async function handleSettingsSubscriptionStatus({ env, userId, groupId, token }) {
  const snapshot = await getSubscriptionSnapshot(env?.DB, userId);

  const message = [
    '💳 Мой тариф и статус подписки',
    '',
    `Текущий тариф: ${snapshot.tariffName}.`,
    `Статус: ${snapshot.statusText}.`,
    `Текстовые сообщения в день: ${snapshot.limits.textPerDay}.`,
    `Голосовые сообщения в день: ${snapshot.limits.voicePerDay}.`,
    snapshot.subscriptionUntilText ? `Оплачено до: ${snapshot.subscriptionUntilText}.` : null,
    '',
    snapshot.note,
  ].filter(Boolean).join('\n');

  return sendVkMessage({
    userId,
    groupId,
    token,
    message,
    keyboard: buildSettingsSubscriptionKeyboard(),
  });
}

function buildSettingsMenuKeyboard() {
  return {
    inline: true,
    buttons: [
      [
        {
          action: {
            type: 'callback',
            label: SETTINGS_SUBSCRIPTION_STATUS_BUTTON_TEXT,
            payload: JSON.stringify({ v: PAYLOAD_VERSION, c: SETTINGS_SUBSCRIPTION_STATUS_COMMAND }),
          },
          color: 'primary',
        },
      ],
      [
        {
          action: {
            type: 'callback',
            label: SETTINGS_BACK_MAIN_MENU_BUTTON_TEXT,
            payload: JSON.stringify({ v: PAYLOAD_VERSION, c: SETTINGS_RETURN_MAIN_MENU_COMMAND }),
          },
          color: 'secondary',
        },
      ],
    ],
  };
}

function buildSettingsSubscriptionKeyboard() {
  return {
    inline: true,
    buttons: [
      [
        {
          action: {
            type: 'callback',
            label: 'Выбрать тариф',
            payload: JSON.stringify({ v: PAYLOAD_VERSION, c: SHOW_TARIFFS_COMMAND }),
          },
          color: 'primary',
        },
      ],
      [
        {
          action: {
            type: 'callback',
            label: '⬅️ Назад в настройки',
            payload: JSON.stringify({ v: PAYLOAD_VERSION, c: SETTINGS_MENU_COMMAND }),
          },
          color: 'secondary',
        },
      ],
      [
        {
          action: {
            type: 'callback',
            label: SETTINGS_BACK_MAIN_MENU_BUTTON_TEXT,
            payload: JSON.stringify({ v: PAYLOAD_VERSION, c: SETTINGS_RETURN_MAIN_MENU_COMMAND }),
          },
          color: 'secondary',
        },
      ],
    ],
  };
}

async function getSubscriptionSnapshot(db, userId) {
  const defaultSnapshot = {
    tariffCode: 'free',
    tariffName: 'Free',
    statusText: 'бесплатный доступ',
    limits: { textPerDay: 5, voicePerDay: 3 },
    subscriptionUntilText: '',
    note: 'Чтобы увеличить лимиты, можно подключить тариф VK Donut.',
  };

  if (!db) {
    return defaultSnapshot;
  }

  const user = await db
    .prepare('SELECT subscription_tier, subscription_until FROM users_vk WHERE vk_id = ? LIMIT 1')
    .bind(userId)
    .first();

  const currentTier = normalizeTier(user?.subscription_tier);
  const donutState = await getDonutAccessState(db, userId);
  const effectiveTier = donutState.isActive && currentTier !== 'free' ? currentTier : 'free';

  if (effectiveTier !== currentTier) {
    await db.prepare('UPDATE users_vk SET subscription_tier = ? WHERE vk_id = ?').bind(effectiveTier, userId).run();
  }

  const tariffInfo = describeTier(effectiveTier);
  const subscriptionUntilText = formatDate(user?.subscription_until);

  return {
    tariffCode: effectiveTier,
    tariffName: tariffInfo.name,
    statusText: effectiveTier === 'free' ? 'бесплатный доступ' : 'подписка активна',
    limits: tariffInfo.limits,
    subscriptionUntilText,
    note: effectiveTier === 'free'
      ? 'Чтобы увеличить лимиты, можно подключить тариф VK Donut.'
      : 'Подписка активна. При продлении лимиты сохраняются ежедневно.',
  };
}

function normalizeTier(tier) {
  const value = String(tier || 'free').toLowerCase();
  if (['tier1', 'tier2', 'tier3', 'free'].includes(value)) {
    return value;
  }
  return 'free';
}

function describeTier(tier) {
  if (tier === 'tier1') {
    return {
      name: 'Beginner',
      limits: { textPerDay: 50, voicePerDay: 20 },
    };
  }

  if (tier === 'tier2') {
    return {
      name: 'Intermediate',
      limits: { textPerDay: 100, voicePerDay: 30 },
    };
  }

  if (tier === 'tier3') {
    return {
      name: 'Advanced',
      limits: { textPerDay: 150, voicePerDay: 50 },
    };
  }

  return {
    name: 'Free',
    limits: { textPerDay: 5, voicePerDay: 3 },
  };
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

async function getDonutAccessState(db, userId) {
  try {
    const row = await db.prepare(`
      SELECT
        MAX(CASE WHEN action IN ('create', 'prolonged') THEN created_at END) AS last_paid_at,
        CAST((julianday('now') - julianday(MAX(CASE WHEN action IN ('create', 'prolonged') THEN created_at END))) AS REAL) AS days_since_paid,
        MAX(CASE WHEN action IN ('cancelled', 'expired') THEN created_at END) AS last_stop_at,
        CAST((julianday('now') - julianday(MAX(CASE WHEN action IN ('cancelled', 'expired') THEN created_at END))) AS REAL) AS days_since_stop
      FROM donut_logs WHERE vk_id = ?
    `).bind(userId).first();

    const paidActive = row?.last_paid_at && row.days_since_paid < 30;
    const recoveryActive = !row?.last_paid_at && row?.last_stop_at && row.days_since_stop < 30;
    return { isActive: Boolean(paidActive || recoveryActive) };
  } catch {
    return { isActive: false };
  }
}