import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type PageBreadcrumbItem = {
  label: string;
  /** Không có `href` → mục hiện tại */
  href?: string;
};

export function PageBreadcrumb({
  items,
  className = "mt-2",
}: {
  items: PageBreadcrumbItem[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Điều hướng" className={className}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 ? (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden />
            ) : null}
            {item.href ? (
              <Link href={item.href} className="font-medium transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
