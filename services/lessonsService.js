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