// lib/repo.web.ts
// Web-only repo: localStorage persistence with same API as native repo.ts

import type { OvertimeEntry, SettingsRow } from "./types";
import dayjs from "dayjs";

const LS_SETTINGS = "ot_settings";
const LS_ENTRIES = "ot_entries";

// ---------- helpers ----------
function readJSON<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: any) {
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureSeed() {
  const settings = readJSON<SettingsRow | null>(LS_SETTINGS, null);
  if (!settings) {
    const seed: SettingsRow = {
      id: 1,
      week_start: "sunday",
      current_base_rate: 15.08,
      weekly_hours: 39,
      multipliers_json: JSON.stringify({ time_and_half: 1.5, double: 2.0 }),
      tax_profile_json: JSON.stringify({ mode: "flat", flatPct: 0.2 }),
    };
    writeJSON(LS_SETTINGS, seed);
  }
  const entries = readJSON<OvertimeEntry[] | null>(LS_ENTRIES, null);
  if (!entries) writeJSON(LS_ENTRIES, []);
}
ensureSeed();

// ---------- API (same names as native repo.ts) ----------
export async function getSettings(): Promise<SettingsRow> {
  return readJSON<SettingsRow>(LS_SETTINGS, {
    id: 1,
    week_start: "sunday",
    current_base_rate: 15.08,
    weekly_hours: 39,
    multipliers_json: JSON.stringify({ time_and_half: 1.5, double: 2.0 }),
    tax_profile_json: JSON.stringify({ mode: "flat", flatPct: 0.2 }),
  });
}

export async function updateSettings(patch: Partial<SettingsRow>) {
  const cur = await getSettings();
  const next = { ...cur, ...patch };
  writeJSON(LS_SETTINGS, next);
}

export async function insertEntry(e: OvertimeEntry) {
  const list = readJSON<OvertimeEntry[]>(LS_ENTRIES, []);
  // assign id
  const maxId = list.reduce((m, x) => Math.max(m, x.id ?? 0), 0);
  e.id = maxId + 1;
  list.push(e);
  writeJSON(LS_ENTRIES, list);
}

export async function getEntryById(id: number) {
  const list = readJSON<OvertimeEntry[]>(LS_ENTRIES, []);
  return list.find((x) => x.id === id) ?? null;
}

export async function updateEntry(id: number, patch: Partial<OvertimeEntry>) {
  const list = readJSON<OvertimeEntry[]>(LS_ENTRIES, []);
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...patch, id };
  writeJSON(LS_ENTRIES, list);
}

export async function deleteEntry(id: number) {
  const list = readJSON<OvertimeEntry[]>(LS_ENTRIES, []);
  const next = list.filter((x) => x.id !== id);
  writeJSON(LS_ENTRIES, next);
}

export async function weekTotals(isoStart: string, isoEnd: string) {
  const list = readJSON<OvertimeEntry[]>(LS_ENTRIES, []);
  const rows = list.filter((x) => x.date >= isoStart && x.date <= isoEnd);
  const hours = round2(rows.reduce((s, r) => s + r.duration_min / 60, 0));
  const gross = round2(rows.reduce((s, r) => s + r.gross, 0));
  const tax = round2(rows.reduce((s, r) => s + r.tax_withheld, 0));
  const net = round2(rows.reduce((s, r) => s + r.net, 0));
  return { hours, gross, tax, net };
}

export async function entriesInRange(isoStart: string, isoEnd: string) {
  const list = readJSON<OvertimeEntry[]>(LS_ENTRIES, []);
  return list
    .filter((x) => x.date >= isoStart && x.date <= isoEnd)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return b.start_min - a.start_min;
    });
}

// ---------- utils ----------
function round2(v: number) {
  return Math.round(v * 100) / 100;
}
