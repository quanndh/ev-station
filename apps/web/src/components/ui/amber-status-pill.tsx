import type { ReactNode } from "react";

/** Viền + nền amber đậm — dùng chung trạm (tạm ngưng sạc) & người dùng (vô hiệu). */
export const amberStatusPillClassName = [
  "inline-flex w-fit max-w-full items-center rounded-full border px-2 py-0.5",
  "text-[10px] font-bold uppercase leading-tight tracking-wide",
  "border-amber-800/45 bg-amber-200 text-amber-950",
  "dark:border-amber-400/50 dark:bg-amber-950 dark:text-amber-50",
].join(" ");

export function AmberStatusPill({ children }: { children: ReactNode }) {
  return <span className={amberStatusPillClassName}>{children}</span>;
}
