"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";

type Item = { href: string; label: string };

export function AdminShell({
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
      { href: "/admin", label: "Tổng quan" },
      { href: "/admin/users", label: "Users" },
      { href: "/admin/stations", label: "Trạm" },
      { href: "/admin/charging/history", label: "Lịch sử sạc" },
      { href: "/admin/pricing", label: "Cài đặt" },
      { href: "/admin/payments", label: "Thanh toán" },
    ],
    [],
  );

  function Nav({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <nav className="grid gap-2">
        {items.map((it) => {
          const active =
            it.href === "/admin"
              ? pathname === "/admin"
              : it.href === "/admin/stations"
                ? pathname === "/admin/stations" || pathname.startsWith("/admin/station/")
                : pathname === it.href || pathname.startsWith(`${it.href}/`);
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
    <div className="mx-auto w-full max-w-[min(112rem,calc(100vw-1.5rem))] px-4 sm:px-6 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        {/* Sidebar chỉ từ xl — tablet dùng drawer như mobile, chừa chỗ cho bảng */}
        <aside className="hidden xl:block">
          <div className="sticky top-24 rounded-[var(--radius-card-lg)] border border-[color:var(--border)]/60 bg-white/60 p-4 shadow-[var(--shadow-soft)] backdrop-blur-md">
            <div className="px-2 pb-3">
              <div className="font-serif text-lg font-extrabold tracking-tight">Admin</div>
            </div>
            <Nav />
          </div>
        </aside>

        {/* Content */}
        <section className="min-w-0 pb-14">{children}</section>
      </div>

      {/* Mobile drawer (opened from header) */}
      {drawerOpen ? (
        <div className="xl:hidden">
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px]"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-[min(92vw,360px)] border-l border-[color:var(--border)]/60 bg-[color:var(--background)] p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div className="font-serif text-lg font-extrabold tracking-tight">Menu</div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setDrawerOpen(false)}
              >
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

