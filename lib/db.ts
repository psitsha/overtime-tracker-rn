import * as SQLite from "expo-sqlite";

// One DB instance for the app
export const dbPromise = SQLite.openDatabaseAsync("overtime.db");

export async function initSchema() {
  const db = await dbPromise;
  await db.execAsync("PRAGMA journal_mode = WAL;");

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS overtime_entry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      start_min INTEGER NOT NULL,
      end_min INTEGER NOT NULL,
      duration_min INTEGER NOT NULL,
      multiplier_applied REAL NOT NULL,
      base_rate_applied REAL NOT NULL,
      gross REAL NOT NULL,
      tax_withheld REAL NOT NULL,
      net REAL NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      week_start TEXT NOT NULL,
      current_base_rate REAL NOT NULL,
      weekly_hours REAL NOT NULL,
      multipliers_json TEXT NOT NULL,
      tax_profile_json TEXT NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS base_rate_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      effective_from TEXT NOT NULL,
      rate REAL NOT NULL
    );
  `);

  // Seed settings if empty
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM settings`
  );
  if (!row || row.count === 0) {
    await db.runAsync(
      `INSERT INTO settings (id, week_start, current_base_rate, weekly_hours, multipliers_json, tax_profile_json)
       VALUES (1, 'sunday', 15.08, 39, '{"time_and_half":1.5,"double":2.0}', '{"mode":"flat","flatPct":0.20}')`
    );
  }
}
