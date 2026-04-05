import { formatViKwh, formatViNumber } from "@/lib/formatVi";

import type { ChargingSessionRangeStats } from "./types";

export function ChargingSessionsStatsSummary({
  stats,
  loading,
  amountLabel = "Tổng tiền",
}: {
  stats: ChargingSessionRangeStats | null;
  loading: boolean;
  /** Tuỳ chỉnh nhãn cột tiền (ví dụ admin vs trạm). */
  amountLabel?: string;
}) {
  if (loading) {
    return (
      <div className="mt-4 border-t border-border/60 pt-4">
        <p className="text-xs text-muted-foreground">Đang tải…</p>
      </div>
    );
  }
  if (!stats) {
    return null;
  }
  return (
    <div className="mt-4 grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-3">
      <div>
        <p className="text-xs text-muted-foreground">Tổng số lần sạc</p>
        <p className="mt-0.5 font-serif text-xl font-extrabold text-foreground">
          {formatViNumber(stats.totalSessions)}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Tổng kWh</p>
        <p className="mt-0.5 font-serif text-xl font-extrabold text-foreground">
          {stats.totalKwh != null ? `${formatViKwh(stats.totalKwh)} kWh` : "—"}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{amountLabel}</p>
        <p className="mt-0.5 font-serif text-xl font-extrabold text-foreground">
          {formatViNumber(stats.totalAmountVnd)} đ
        </p>
      </div>
    </div>
  );
}

