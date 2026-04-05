import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost";
type Size = "xs" | "sm" | "md" | "lg";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 font-semibold rounded-full transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)] disabled:pointer-events-none disabled:opacity-50";

  const sizes: Record<Size, string> = {
    xs: "h-8 min-h-8 px-3.5 text-xs",
    sm: "h-10 px-6 text-sm",
    md: "h-12 px-8 text-base",
    lg: "h-14 px-10 text-base",
  };

  const variants: Record<Variant, string> = {
    primary:
      "bg-[color:var(--primary)] text-[color:var(--primary-foreground)] shadow-[var(--shadow-soft)] hover:scale-[1.02] hover:shadow-[0_6px_24px_-4px_rgba(93,112,82,0.25)]",
    outline:
      "bg-transparent text-[color:var(--secondary)] border-2 border-[color:var(--secondary)]/80 hover:bg-[color:var(--secondary)]/10 hover:scale-[1.02]",
    ghost:
      "bg-transparent text-[color:var(--primary)] hover:bg-[color:var(--primary)]/10 hover:scale-[1.02]",
  };

  return (
    <button
      {...props}
      className={[base, sizes[size], variants[variant], className].join(" ")}
    />
  );
}

