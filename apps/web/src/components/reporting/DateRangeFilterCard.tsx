import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { vnDefaultMonthRangeYmd } from "@/lib/vnDateRange";

export function DateRangeFilterCard({
  idPrefix,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  className = "",
  children,
}: {
  idPrefix: string;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  /** Thống kê / trạng thái tải — đặt bên dưới kẻ ngang */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className} padding="compact">
      <p className="text-xs font-semibold text-foreground">Theo ngày</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="grid gap-1">
          <label className="text-xs text-muted-foreground" htmlFor={`${idPrefix}-from`}>
            Từ ngày
          </label>
          <input
            id={`${idPrefix}-from`}
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="h-11 rounded-full border border-border bg-white/60 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>
        <div className="grid gap-1">
          <label className="text-xs text-muted-foreground" htmlFor={`${idPrefix}-to`}>
            Đến ngày
          </label>
          <input
            id={`${idPrefix}-to`}
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="h-11 rounded-full border border-border bg-white/60 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>
        <button
          type="button"
          className="h-11 rounded-full border-2 border-secondary/80 px-5 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/10"
          onClick={() => {
            const d = vnDefaultMonthRangeYmd();
            onDateFromChange(d.from);
            onDateToChange(d.to);
          }}
        >
          Tháng này
        </button>
      </div>
      {children}
    </Card>
  );
}
