export async function ensureLessonsTables(db) {
  if (!db) {
    return;
  }

  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS lessons (
        id INTEGER PRIMARY KEY,
        level_id INTEGER NOT NULL,
        order_num INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        is_premium INTEGER NOT NULL DEFAULT 0
      )
    `)
    .run();

  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS lesson_steps (
        lesson_id INTEGER NOT NULL,
        order_num INTEGER NOT NULL,
        step_type TEXT NOT NULL,
        content_json TEXT NOT NULL,
        PRIMARY KEY (lesson_id, order_num)
      )
    `)
    .run();

  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS user_lesson_progress (
        vk_id BIGINT NOT NULL,
        lesson_id INTEGER NOT NULL,
        current_step_num INTEGER DEFAULT 1,
        status TEXT DEFAULT 'in_progress',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (vk_id, lesson_id),
        FOREIGN KEY (vk_id) REFERENCES users_vk(vk_id),
        FOREIGN KEY (lesson_id) REFERENCES lessons(id)
      )
    `)
    .run();
}

export async function getLessonsByLevel(db, levelId) {
  if (!db) {
    return [];
  }

  const result = await db
    .prepare(`
      SELECT id, level_id, order_num, title, description, is_premium
      FROM lessons
      WHERE level_id = ?
      ORDER BY order_num ASC
    `)
    .bind(levelId)
    .all();

  return Array.isArray(result?.results) ? result.results : [];
}

export async function getLessonSteps(db, lessonId) {
  if (!db) {
    return [];
  }

  const result = await db
    .prepare(`
      SELECT order_num, step_type, content_json
      FROM lesson_steps
      WHERE lesson_id = ?
      ORDER BY order_num ASC
    `)
    .bind(lessonId)
    .all();

  const rows = Array.isArray(result?.results) ? result.results : [];
  return rows.map((row) => {
    let content = {};
    try {
      content = JSON.parse(row.content_json || '{}');
    } catch {
      content = {};
    }

    return {
      order_num: row.order_num,
      step_type: row.step_type,
      content,
    };
  });
}

export async function getCompletedLessonIds(db, vkId, lessonIds = []) {
  if (!db || !Number.isFinite(Number(vkId)) || !Array.isArray(lessonIds) || lessonIds.length === 0) {
    return new Set();
  }

  const placeholders = lessonIds.map(() => '?').join(', ');
  const result = await db
    .prepare(`
      SELECT lesson_id
      FROM user_lesson_progress
      WHERE vk_id = ?
        AND status = 'completed'
        AND lesson_id IN (${placeholders})
    `)
    .bind(vkId, ...lessonIds)
    .all();

  const rows = Array.isArray(result?.results) ? result.results : [];
  return new Set(rows.map((row) => Number(row.lesson_id)));
}

export async function upsertLessonProgress(db, vkId, lessonId, currentStepNum, status = 'in_progress') {
  if (!db) {
    return;
  }

  await db
    .prepare(`
      INSERT INTO user_lesson_progress (vk_id, lesson_id, current_step_num, status, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(vk_id, lesson_id) DO UPDATE SET
        current_step_num = excluded.current_step_num,
        status = excluded.status,
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(vkId, lessonId, currentStepNum, status)
    .run();
}