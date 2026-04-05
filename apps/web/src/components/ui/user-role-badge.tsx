import type { Role } from "@ev/types";

const ROLE_STYLES: Record<
  Role,
  { label: string; className: string }
> = {
  admin: {
    label: "Quản trị",
    className:
      "border-rose-700/45 bg-rose-100 text-rose-950 dark:border-rose-400/50 dark:bg-rose-950 dark:text-rose-50",
  },
  station_owner: {
    label: "Chủ trạm",
    className:
      "border-sky-700/45 bg-sky-100 text-sky-950 dark:border-sky-400/50 dark:bg-sky-950 dark:text-sky-50",
  },
  user: {
    label: "Người dùng",
    className:
      "border-emerald-700/40 bg-emerald-100 text-emerald-950 dark:border-emerald-400/50 dark:bg-emerald-950 dark:text-emerald-50",
  },
};

export function UserRoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_STYLES[role];
  return (
    <span
      className={[
        "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide sm:text-xs",
        cfg.className,
      ].join(" ")}
    >
      {cfg.label}
    </span>
  );
}
