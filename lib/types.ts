export type OTType = "TIME_AND_HALF" | "DOUBLE";

export interface OvertimeEntry {
  id?: number;
  date: string;              // ISO "YYYY-MM-DD"
  start_min: number;         // minutes since midnight
  end_min: number;           // minutes since midnight (allow cross-midnight)
  duration_min: number;
  multiplier_applied: number;
  base_rate_applied: number;
  gross: number;
  tax_withheld: number;
  net: number;
  notes?: string | null;
  created_at: string;        // ISO datetime
}

export interface SettingsRow {
  id?: number; // fixed 1
  week_start: "sunday" | "monday";
  current_base_rate: number;     // e.g., 15.08
  weekly_hours: number;          // 39
  multipliers_json: string;      // {"time_and_half":1.5,"double":2.0}
  tax_profile_json: string;      // {"mode":"flat","flatPct":0.2}
}
