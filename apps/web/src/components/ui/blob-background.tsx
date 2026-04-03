import type { ReactNode } from "react";

const blobs = [
  "rounded-[60%_40%_30%_70%/60%_30%_70%_40%]",
  "rounded-[55%_45%_65%_35%/55%_35%_65%_45%]",
  "rounded-[35%_65%_60%_40%/40%_35%_65%_60%]",
];

export function BlobBackground({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "relative flex min-h-dvh w-full flex-col overflow-hidden",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[color:var(--accent)]/20 via-transparent to-[color:var(--primary)]/10" />
      <div
        className={[
          "pointer-events-none absolute -top-28 -left-24 h-[28rem] w-[28rem] blur-3xl opacity-40",
          blobs[0],
          "bg-[color:var(--accent)]",
        ].join(" ")}
      />
      <div
        className={[
          "pointer-events-none absolute -bottom-32 -right-24 h-[30rem] w-[30rem] blur-3xl opacity-30",
          blobs[1],
          "bg-[color:var(--primary)]",
        ].join(" ")}
      />
      <div
        className={[
          "pointer-events-none absolute top-24 right-10 h-72 w-72 blur-3xl opacity-25",
          blobs[2],
          "bg-[color:var(--secondary)]",
        ].join(" ")}
      />
      <div className="relative z-[1] flex min-h-0 w-full flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}

