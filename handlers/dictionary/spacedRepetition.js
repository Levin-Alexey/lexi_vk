/**
 * Расчет следующего интервала по алгоритму SM-2
 * @param {number} quality - Оценка от ученика: 1 (Забыл), 3 (С трудом), 4 (Помню), 5 (Легко)
 * @param {number} repetitions - Текущее кол-во успешных повторений
 * @param {number} easiness - Текущий коэффициент легкости (EF)
 * @param {number} interval - Текущий интервал (в днях)
 * @returns {Object} Новые значения для сохранения в БД
 */
export function calculateNextReview(quality, repetitions, easiness, interval) {
  let newRepetitions = repetitions;
  let newInterval = interval;
  let newEasiness = easiness;

  // Если качество < 3 (Пользователь забыл слово или вспомнил с огромным трудом)
  if (quality < 3) {
    newRepetitions = 0;
    newInterval = 1; // Возвращаем слово на завтра
  } else {
    // Пользователь вспомнил слово
    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easiness);
    }
    newRepetitions += 1;
  }

  // Обновляем коэффициент легкости по формуле SM-2
  newEasiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEasiness < 1.3) newEasiness = 1.3; // EF не может быть меньше 1.3

  // Рассчитываем точную дату следующего повторения
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    repetition: newRepetitions,
    interval_days: newInterval,
    easiness_factor: Number(newEasiness.toFixed(3)),
    next_review_at: nextReviewDate.toISOString()
  };
}