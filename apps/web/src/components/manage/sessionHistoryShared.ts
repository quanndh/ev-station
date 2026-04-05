import { formatViDateTime, formatViTime, viDayKeyFromIso } from "@/lib/formatVi";

export type SessionHistoryListRow = {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  kWh: string | null;
  amountVnd: number | null;
  paymentStatus: string;
  userEmail: string | null;
  userName: string | null;
};

const sessionStatusVi: Record<string, string> = {
  active: "Đang sạc",
  completed: "Hoàn thành",
  cancelled: "Đã huỷ",
};

const paymentStatusVi: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  cancelled: "Đã huỷ",
};

export function sessionStatusLabel(v: string) {
  return sessionStatusVi[v] ?? v;
}

export function paymentStatusLabel(v: string) {
  return paymentStatusVi[v] ?? v;
}

export function sessionDurationMs(s: SessionHistoryListRow): number {
  const t0 = new Date(s.startedAt).getTime();
  const t1 = s.endedAt ? new Date(s.endedAt).getTime() : Date.now();
  return Math.max(0, t1 - t0);
}

/** Kết thúc: cùng ngày (VN) → chỉ giờ; khác ngày → ngày giờ đầy đủ; chưa kết thúc → Đang sạc / — */
export function formatSessionEndDisplay(
  startedAt: string,
  endedAt: string | null,
  sessionStatus: string,
): string {
  if (!endedAt) {
    return sessionStatus === "active" ? "Đang sạc" : "—";
  }
  if (viDayKeyFromIso(startedAt) === viDayKeyFromIso(endedAt)) {
    return formatViTime(endedAt);
  }
  return formatViDateTime(endedAt);
}

export function formatSessionVnd(amount: number | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Lớp badge theo loại trạng thái phiên (màu rõ trên bảng + thẻ). */
export function sessionStatusBadgeClass(status: string): string {
  if (status === "active") {
    return "border-amber-700/25 bg-amber-100 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-50";
  }
  if (status === "cancelled") {
    return "border-border bg-muted/80 text-muted-foreground";
  }
  return "border-emerald-800/20 bg-emerald-100 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-50";
}

/** Lớp badge theo trạng thái thanh toán. */
export function paymentStatusBadgeClass(status: string): string {
  if (status === "pending") {
    return "border-amber-700/25 bg-amber-100 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-50";
  }
  if (status === "cancelled") {
    return "border-border bg-muted/80 text-muted-foreground";
  }
  return "border-sky-800/20 bg-sky-100 text-sky-950 dark:border-sky-500/30 dark:bg-sky-950/50 dark:text-sky-50";
}
