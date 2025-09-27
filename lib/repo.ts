import { dbPromise } from "./db";
import type { OvertimeEntry, SettingsRow } from "./types";

export async function getSettings(): Promise<SettingsRow> {
  const db = await dbPromise;
  const row = await db.getFirstAsync<SettingsRow>(`SELECT * FROM settings WHERE id=1`);
  if (!row) throw new Error("Settings not found");
  return row;
}

export async function updateSettings(patch: Partial<SettingsRow>) {
  const db = await dbPromise;
  const cur = await getSettings();
  const next = { ...cur, ...patch };
  await db.runAsync(
    `UPDATE settings SET week_start=?, current_base_rate=?, weekly_hours=?, multipliers_json=?, tax_profile_json=? WHERE id=1`,
    [
      next.week_start,
      next.current_base_rate,
      next.weekly_hours,
      next.multipliers_json,
      next.tax_profile_json,
    ]
  );
}

export async function insertEntry(e: OvertimeEntry) {
  const db = await dbPromise;
  await db.runAsync(
    `INSERT INTO overtime_entry
     (date, start_min, end_min, duration_min, multiplier_applied, base_rate_applied, gross, tax_withheld, net, notes, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      e.date,
      e.start_min,
      e.end_min,
      e.duration_min,
      e.multiplier_applied,
      e.base_rate_applied,
      e.gross,
      e.tax_withheld,
      e.net,
      e.notes ?? null,
      e.created_at,
    ]
  );
}

export async function weekTotals(isoStart: string, isoEnd: string) {
  const db = await dbPromise;
  const row = await db.getFirstAsync<{ hours: number; gross: number; tax: number; net: number }>(
    `SELECT
       ROUND(COALESCE(SUM(duration_min),0)/60.0, 2) AS hours,
       ROUND(COALESCE(SUM(gross),0), 2)           AS gross,
       ROUND(COALESCE(SUM(tax_withheld),0), 2)    AS tax,
       ROUND(COALESCE(SUM(net),0), 2)             AS net
     FROM overtime_entry
     WHERE date BETWEEN ? AND ?`,
    [isoStart, isoEnd]
  );
  return row ?? { hours: 0, gross: 0, tax: 0, net: 0 };
}

export async function entriesInRange(isoStart: string, isoEnd: string) {
  const db = await dbPromise;
  return db.getAllAsync<OvertimeEntry>(
    `SELECT * FROM overtime_entry WHERE date BETWEEN ? AND ? ORDER BY date DESC, start_min DESC`,
    [isoStart, isoEnd]
  );
}
