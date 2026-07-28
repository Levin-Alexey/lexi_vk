import { sendVkMessage } from '../../services/vkApi.js';
import { ensureLessonsTables } from '../../services/lessonsService.js';
import { ensureLcoinTables } from '../../services/lcoinTables.js';
import { PROFILE_ACTIVITY_BUTTON_TEXT, PROFILE_BUTTON_TEXT, PROFILE_LCOIN_BUTTON_TEXT, PROFILE_PROGRESS_BUTTON_TEXT, PROFILE_SUMMARY_BUTTON_TEXT, RETURN_MAIN_MENU_BUTTON_TEXT } from './constants.js';

const PAYLOAD_VERSION = 1;
const PROFILE_MENU_COMMAND = 'profile_menu';
const PROFILE_SUMMARY_COMMAND = 'profile_summary';
const PROFILE_PROGRESS_COMMAND = 'profile_progress';
const PROFILE_LCOIN_COMMAND = 'profile_lcoin';
const PROFILE_ACTIVITY_COMMAND = 'profile_activity';

export function profileMenuPayload() {
  return JSON.stringify({ v: PAYLOAD_VERSION, c: PROFILE_MENU_COMMAND });
}

function profileSummaryPayload() {
  return JSON.stringify({ v: PAYLOAD_VERSION, c: PROFILE_SUMMARY_COMMAND });
}

function profileProgressPayload() {
  return JSON.stringify({ v: PAYLOAD_VERSION, c: PROFILE_PROGRESS_COMMAND });
}

function profileLcoinPayload() {
  return JSON.stringify({ v: PAYLOAD_VERSION, c: PROFILE_LCOIN_COMMAND });
}

function profileActivityPayload() {
  return JSON.stringify({ v: PAYLOAD_VERSION, c: PROFILE_ACTIVITY_COMMAND });
}

export function isProfileButtonText(text) {
  return String(text || '').trim() === PROFILE_BUTTON_TEXT;
}

export function isProfileMenuCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === PROFILE_MENU_COMMAND;
}

export function isProfileSummaryCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === PROFILE_SUMMARY_COMMAND;
}

export function isProfileProgressCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === PROFILE_PROGRESS_COMMAND;
}

export function isProfileLcoinCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === PROFILE_LCOIN_COMMAND;
}

export function isProfileActivityCommand(payload) {
  return payload?.v === PAYLOAD_VERSION && payload?.c === PROFILE_ACTIVITY_COMMAND;
}

export async function handleProfileMenu({ userId, groupId, token }) {
  return sendVkMessage({
    userId,
    groupId,
    token,
    message: [
      'Личный кабинет 👨🏼‍💻',
      '',
      'Здесь собраны основные показатели обучения и активности.',
      'Выберите раздел ниже, чтобы посмотреть детали.',
    ].join('\n'),
    keyboard: buildProfileMenuKeyboard(),
  });
}

export async function handleProfileSummary({ env, userId, groupId, token }) {
  const totalWords = await getUserDictionaryCount(env?.DB, userId);

  return sendVkMessage({
    userId,
    groupId,
    token,
    message: [
      '📚 Выученные слова',
      '',
      `У тебя в словаре ${totalWords} слов.`,
      'Здесь мы показываем слова, которые уже сохранены и доступны для повторения.',
    ].join('\n'),
    keyboard: buildBackToProfileKeyboard(),
  });
}

export async function handleProfileProgress({ env, userId, groupId, token }) {
  const completedLessons = await getCompletedLessonsCount(env?.DB, userId);

  return sendVkMessage({
    userId,
    groupId,
    token,
    message: [
      '📈 Мой прогресс',
      '',
      `Пройдено уроков: ${completedLessons}.`,
      'Позже сюда можно добавить прогресс по уровням и процент завершения.',
    ].join('\n'),
    keyboard: buildBackToProfileKeyboard(),
  });
}

export async function handleProfileLcoin({ env, userId, groupId, token }) {
  const balance = await getUserLcoinBalance(env?.DB, userId);

  return sendVkMessage({
    userId,
    groupId,
    token,
    message: [
      '🪙 LexiCoin',
      '',
      `Сейчас у тебя ${balance} LexiCoin.`,
      'Монеты начисляются за активность и достижения.',
    ].join('\n'),
    keyboard: buildBackToProfileKeyboard(),
  });
}

export async function handleProfileActivity({ env, userId, groupId, token }) {
  const stats = await getActivityStats(env?.DB, userId);

  return sendVkMessage({
    userId,
    groupId,
    token,
    message: [
      '📊 Статистика активности',
      '',
      `Текстовых сообщений: ${stats.textMessages}.`,
      `Голосовых сообщений: ${stats.voiceMessages}.`,
      `Всего активности: ${stats.totalMessages}.`,
    ].join('\n'),
    keyboard: buildBackToProfileKeyboard(),
  });
}

function buildProfileMenuKeyboard() {
  return {
    inline: true,
    buttons: [
      [{ action: { type: 'callback', label: PROFILE_SUMMARY_BUTTON_TEXT, payload: profileSummaryPayload() }, color: 'primary' }],
      [{ action: { type: 'callback', label: PROFILE_PROGRESS_BUTTON_TEXT, payload: profileProgressPayload() }, color: 'primary' }],
      [{ action: { type: 'callback', label: PROFILE_LCOIN_BUTTON_TEXT, payload: profileLcoinPayload() }, color: 'primary' }],
      [{ action: { type: 'callback', label: PROFILE_ACTIVITY_BUTTON_TEXT, payload: profileActivityPayload() }, color: 'secondary' }],
      [{ action: { type: 'text', label: RETURN_MAIN_MENU_BUTTON_TEXT }, color: 'secondary' }],
    ],
  };
}

function buildBackToProfileKeyboard() {
  return {
    inline: true,
    buttons: [
      [{ action: { type: 'callback', label: '⬅️ Назад в кабинет', payload: profileMenuPayload() }, color: 'secondary' }],
      [{ action: { type: 'text', label: RETURN_MAIN_MENU_BUTTON_TEXT }, color: 'secondary' }],
    ],
  };
}

async function getUserDictionaryCount(db, userId) {
  if (!db) return 0;
  const row = await db.prepare('SELECT COUNT(*) AS total FROM user_dictionary WHERE vk_id = ?').bind(userId).first();
  return Number(row?.total || 0);
}

async function getCompletedLessonsCount(db, userId) {
  if (!db) return 0;
  await ensureLessonsTables(db);
  const result = await db
    .prepare("SELECT lesson_id FROM user_lesson_progress WHERE vk_id = ? AND status = 'completed'")
    .bind(userId)
    .all();
  return Array.isArray(result?.results) ? result.results.length : 0;
}

async function getUserLcoinBalance(db, userId) {
  if (!db) return 0;
  await ensureLcoinTables(db);
  const row = await db.prepare('SELECT balance FROM user_balances WHERE vk_id = ? LIMIT 1').bind(userId).first();
  return Number(row?.balance || 0);
}

async function getActivityStats(db, userId) {
  if (!db) {
    return { textMessages: 0, voiceMessages: 0, totalMessages: 0 };
  }

  await ensureLcoinTables(db);

  const [textRow, voiceRow] = await Promise.all([
    db.prepare('SELECT total_count FROM user_reward_progress WHERE vk_id = ? AND metric_key = ? LIMIT 1').bind(userId, 'text_msg').first(),
    db.prepare('SELECT total_count FROM user_reward_progress WHERE vk_id = ? AND metric_key = ? LIMIT 1').bind(userId, 'voice_msg').first(),
  ]);

  const textMessages = Number(textRow?.total_count || 0);
  const voiceMessages = Number(voiceRow?.total_count || 0);

  return { textMessages, voiceMessages, totalMessages: textMessages + voiceMessages };
}