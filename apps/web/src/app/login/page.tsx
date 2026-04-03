"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { BlobBackground } from "@/components/ui/blob-background";
import { Button } from "@/components/ui/button";
import { Card, CardMuted, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { SiteHeader } from "@/components/nav/SiteHeader";

import { login as loginApi } from "@/lib/authClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await loginApi(email.trim(), password);
      if (user.role === "admin") router.replace("/admin");
      else if (user.role === "station_owner") router.replace("/owner");
      else router.replace("/");
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <BlobBackground>
      <SiteHeader />
      <main className="flex flex-1 flex-col py-10 sm:py-14">
        <Container className="max-w-md">
          <Card className="rounded-tl-[4rem]">
            <CardTitle>Đăng nhập</CardTitle>
            <CardMuted>
              Seed mặc định: <span className="font-mono">admin@local/admin123</span> ·{" "}
              <span className="font-mono">owner@local/owner123</span> ·{" "}
              <span className="font-mono">user@local/user123</span>
            </CardMuted>
            <form
              className="mt-6 grid gap-4"
              onSubmit={onSubmit}
            >
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-[color:var(--foreground)]">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-full border border-[color:var(--border)] bg-white/50 px-5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]"
                  placeholder="admin@local"
                  autoComplete="email"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-[color:var(--foreground)]">
                  Mật khẩu
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  className="h-12 w-full rounded-full border border-[color:var(--border)] bg-white/50 px-5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <Button size="lg" type="submit" disabled={loading || !email.trim() || !password}>
                {loading ? "Đang đăng nhập…" : "Đăng nhập"}
              </Button>

              {error ? (
                <div className="rounded-[1.25rem] border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/10 p-4 text-sm">
                  Lỗi: {error}
                </div>
              ) : null}
            </form>
          </Card>
        </Container>
      </main>
    </BlobBackground>
  );
}
