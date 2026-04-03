import { formatViDate, viDayKeyFromIso } from "@/lib/formatVi";

export function groupRowsByViDay<T>(rows: T[], getIso: (row: T) => string) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = viDayKeyFromIso(getIso(row));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  const keys = [...map.keys()].sort((a, b) => b.localeCompare(a));
  return keys.map((dayKey) => ({
    dayKey,
    dayLabel: formatViDate(new Date(`${dayKey}T12:00:00+07:00`)),
    items: (map.get(dayKey) ?? []).sort(
      (a, b) => new Date(getIso(b)).getTime() - new Date(getIso(a)).getTime(),
    ),
  }));
}
