import dayjs from "dayjs";

export function currentWeekWindowSundayToSaturday(today = dayjs()) {
  // day(): 0=Sunday … 6=Saturday
  const weekday = today.day();
  const start = today.subtract(weekday, "day").startOf("day"); // Sunday
  const end = start.add(6, "day").endOf("day");                // Saturday
  return { start, end };
}

export function isoDate(d: dayjs.Dayjs) {
  return d.format("YYYY-MM-DD");
}

export function fmtHm(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}
