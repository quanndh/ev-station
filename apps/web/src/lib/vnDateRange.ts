/** Múi giờ lọc theo lịch người dùng VN */
const TZ = "Asia/Ho_Chi_Minh";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function parseYmdParam(s: string | null): string | null {
  if (!s || !YMD.test(s)) return null;
  return s;
}

/** Tháng hiện tại theo lịch VN: yyyy-mm-dd đầu và cuối tháng (inclusive). */
export function vnDefaultMonthRangeYmd(now = new Date()): { from: string; to: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")?.value ?? "1970");
  const m = Number(parts.find((p) => p.type === "month")?.value ?? "1");
  const yStr = String(y);
  const mStr = String(m).padStart(2, "0");
  const from = `${yStr}-${mStr}-01`;
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const nextFirst = `${nextY}-${String(nextM).padStart(2, "0")}-01`;
  const endExclusiveMs = new Date(`${nextFirst}T00:00:00+07:00`).getTime();
  const endInclusive = new Date(endExclusiveMs - 1);
  const endParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(endInclusive);
  const ey = endParts.find((p) => p.type === "year")?.value ?? yStr;
  const em = endParts.find((p) => p.type === "month")?.value ?? mStr;
  const ed = endParts.find((p) => p.type === "day")?.value ?? "01";
  return { from, to: `${ey}-${em}-${ed}` };
}

/** Biên UTC tương ứng cả ngày VN (bao gồm cả ngày cuối). */
export function vnYmdRangeToUtcBounds(fromYmd: string, toYmd: string): { gte: Date; lte: Date } {
  const gte = new Date(`${fromYmd}T00:00:00+07:00`);
  const lte = new Date(`${toYmd}T23:59:59.999+07:00`);
  return { gte, lte };
}

/**
 * Đọc dateFrom/dateTo từ query. Thiếu → mặc định tháng hiện tại (VN).
 * from > to → đổi chỗ.
 */
export function resolveListDateRangeFromUrl(url: URL): {
  fromYmd: string;
  toYmd: string;
  gte: Date;
  lte: Date;
} {
  const def = vnDefaultMonthRangeYmd();
  let fromYmd = parseYmdParam(url.searchParams.get("dateFrom")) ?? def.from;
  let toYmd = parseYmdParam(url.searchParams.get("dateTo")) ?? def.to;
  if (fromYmd > toYmd) {
    const t = fromYmd;
    fromYmd = toYmd;
    toYmd = t;
  }
  const { gte, lte } = vnYmdRangeToUtcBounds(fromYmd, toYmd);
  return { fromYmd, toYmd, gte, lte };
}
