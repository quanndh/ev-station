import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padding = "default",
}: {
  children: ReactNode;
  className?: string;
  /** compact: ít padding — danh sách dài trên mobile/desktop. */
  padding?: "default" | "compact";
}) {
  const pad = padding === "compact" ? "p-3.5 sm:p-4" : "p-5 sm:p-6";
  return (
    <div
      className={[
        "bg-white/60 backdrop-blur-[2px]",
        "border border-[color:var(--border)]/60",
        "rounded-[var(--radius-card-lg)]",
        "shadow-[var(--shadow-soft)]",
        pad,
        "transition-all duration-300",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={[
        "font-serif text-xl sm:text-2xl font-bold tracking-tight text-[color:var(--foreground)]",
        className,
      ].join(" ")}
    >
      {children}
    </h2>
  );
}

export function CardMuted({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-sm sm:text-base text-[color:var(--muted-foreground)]">
      {children}
    </p>
  );
}

// Optional: a muted paragraph with custom classes when needed
export function CardMutedLine({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={["mt-2 text-sm text-[color:var(--muted-foreground)]", className].join(" ")}>
      {children}
    </p>
  );
}

