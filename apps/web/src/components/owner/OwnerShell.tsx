"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";

type Item = { href: string; label: string; match?: "exact" | "prefix" };

export function OwnerShell({
  children,
  drawerOpen,
  setDrawerOpen,
}: {
  children: React.ReactNode;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}) {
  const pathname = usePathname();

  const items: Item[] = useMemo(
    () => [
      { href: "/owner", label: "Tổng quan", match: "exact" },
      { href: "/owner/stations", label: "Trạm", match: "prefix" },
      { href: "/owner/payments", label: "Thanh toán", match: "exact" },
    ],
    [],
  );

  function isActive(it: Item) {
    if (it.match === "prefix") return pathname === it.href || pathname.startsWith(`${it.href}/`);
    return pathname === it.href;
  }

  function Nav({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <nav className="grid gap-2">
        {items.map((it) => {
          const active = isActive(it);
          return (
            <Link
              key={it.href}
              href={it.href}
              onClick={onNavigate}
              className={[
                "rounded-[1.25rem] border px-4 py-3 text-sm font-semibold transition",
                active
                  ? "border-[color:var(--primary)]/30 bg-[color:var(--primary)]/10 text-[color:var(--foreground)]"
                  : "border-[color:var(--border)]/60 bg-white/50 text-[color:var(--muted-foreground)] hover:bg-white/70",
              ].join(" ")}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-[var(--radius-card-lg)] border border-[color:var(--border)]/60 bg-white/60 p-4 shadow-[var(--shadow-soft)] backdrop-blur-md">
            <div className="px-2 pb-3">
              <div className="font-serif text-lg font-extrabold tracking-tight">Owner</div>
              <div className="mt-1 text-xs text-[color:var(--muted-foreground)]">Menu trạm của bạn</div>
            </div>
            <Nav />
          </div>
        </aside>

        <section className="min-w-0 pb-14">{children}</section>
      </div>

      {drawerOpen ? (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px]"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-[min(92vw,360px)] border-l border-[color:var(--border)]/60 bg-[color:var(--background)] p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div className="font-serif text-lg font-extrabold tracking-tight">Menu</div>
              <Button type="button" size="sm" variant="outline" onClick={() => setDrawerOpen(false)}>
                Đóng
              </Button>
            </div>
            <div className="mt-4">
              <Nav onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
