"use client";

import { useEffect, useState } from "react";

import { Card, CardMuted, CardTitle } from "@/components/ui/card";
import { ClientGuard } from "@/components/auth/ClientGuard";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { authedFetch } from "@/lib/authClient";

type Global = { priceVndPerKwh: number; updatedAt: string } | null;

export default function AdminPricingPage() {
  const [global, setGlobal] = useState<Global>(null);
  const [price, setPrice] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    authedFetch("/api/admin/pricing/global")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const g = d.global as { priceVndPerKwh: number; updatedAt: string } | null | undefined;
        setGlobal(g ? { priceVndPerKwh: g.priceVndPerKwh, updatedAt: g.updatedAt } : null);
        if (g && price === "") setPrice(String(g.priceVndPerKwh));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <ClientGuard allow={["admin"]}>
      <h1 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight">
        Cài đặt
      </h1>
      <PageBreadcrumb
        className="mt-2"
        items={[
          { href: "/admin", label: "Tổng quan" },
          { label: "Cài đặt" },
        ]}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <Card className="rounded-tl-[3rem]">
                <CardTitle>Giá điện</CardTitle>
                <div className="mt-4 text-3xl font-extrabold">
                  {global?.priceVndPerKwh ?? 0}{" "}
                  <span className="text-base font-semibold text-[color:var(--muted-foreground)]">
                    VNĐ/kWh
                  </span>
                </div>
                <CardMuted>{global?.updatedAt ? `Cập nhật: ${global.updatedAt}` : "—"}</CardMuted>
              </Card>

              <Card className="rounded-tr-[3rem]">
                <CardTitle>Cập nhật giá</CardTitle>
                <form
                  className="mt-6 grid gap-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setError(null);
                    const v = Number(price);
                    if (!Number.isFinite(v) || v <= 0) {
                      setError("Giá không hợp lệ.");
                      return;
                    }
                    setSaving(true);
                    try {
                      const res = await authedFetch("/api/admin/pricing/global", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ priceVndPerKwh: Math.floor(v) }),
                      });
                      const d = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(d.error ?? "Update failed");
                      const g = d.global as { priceVndPerKwh: number; updatedAt: string } | undefined;
                      if (g) setGlobal({ priceVndPerKwh: g.priceVndPerKwh, updatedAt: g.updatedAt });
                    } catch (err: any) {
                      setError(err?.message ?? "Update failed");
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-[color:var(--foreground)]">
                      Giá (VNĐ/kWh)
                    </label>
                    <input
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      inputMode="numeric"
                      className="h-12 w-full rounded-full border border-[color:var(--border)] bg-white/50 px-5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]"
                      placeholder="3500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="h-12 w-full rounded-full bg-[color:var(--primary)] px-6 text-sm font-semibold text-[color:var(--primary-foreground)] shadow-[var(--shadow-soft)] hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
                  >
                    {saving ? "Đang lưu…" : "Lưu"}
                  </button>

                  {error ? (
                    <div className="rounded-[1.25rem] border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/10 p-4 text-sm">
                      Lỗi: {error}
                    </div>
                  ) : null}
                </form>
              </Card>
            </div>
    </ClientGuard>
  );
}

