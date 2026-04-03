/**
 * Mark logo dùng chung (header, v.v.) — cùng file với favicon: `/brand/logo-mark.svg`.
 */
export function LogoMark({
  className = "h-9 w-9",
  title,
}: {
  className?: string;
  /** Ẩn mặc định (decorative); truyền nếu cần cho screen reader. */
  title?: string;
}) {
  return (
    <img
      src="/brand/logo-mark.svg"
      alt=""
      width={36}
      height={36}
      className={["shrink-0 rounded-lg object-contain", className].filter(Boolean).join(" ")}
      decoding="async"
      {...(title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true })}
    />
  );
}
