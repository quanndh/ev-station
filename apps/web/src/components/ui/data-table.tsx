import type { ReactNode } from "react";

/** Vỏ bảng cuộn ngang — dùng chung admin / owner / thanh toán. */
export function DataTableShell({
  children,
  minWidthClass = "min-w-[560px]",
  className = "",
}: {
  children: ReactNode;
  /** Ví dụ min-w-[720px] khi nhiều cột. */
  minWidthClass?: string;
  className?: string;
}) {
  return (
    <div
      className={[
        "overflow-x-auto rounded-xl border border-[color:var(--primary)]/25 bg-white/55 shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--secondary)]/15",
        className,
      ].join(" ")}
    >
      <table
        className={["w-full border-collapse text-left text-sm", minWidthClass].join(" ")}
      >
        {children}
      </table>
    </div>
  );
}

export const dataTableHeadRowClass =
  "border-b border-[color:var(--primary)]/20 bg-[color:var(--accent)]/70 text-xs font-bold uppercase tracking-wide text-[color:var(--accent-foreground)]";

export const dataTableBodyRowClass =
  "border-b border-[color:var(--foreground)]/[0.09] bg-white/50 transition-colors last:border-b-0 hover:bg-[color:var(--accent)]/35";

export const dataTableTh = "whitespace-nowrap px-3 py-3 text-left sm:px-4";
export const dataTableTd = "px-3 py-3 align-top sm:px-4";
export const dataTableTdRight = "px-3 py-3 text-right align-top tabular-nums sm:px-4";
