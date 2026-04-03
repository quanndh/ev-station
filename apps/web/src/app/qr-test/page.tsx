"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

import { BlobBackground } from "@/components/ui/blob-background";
import { Button } from "@/components/ui/button";
import { Card, CardMuted, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { SiteHeader } from "@/components/nav/SiteHeader";
import {
  DEFAULT_DEMO_STATION_ID,
  demoStationAbsoluteUrl,
  resolvedDemoStationSlug,
} from "@/lib/demoDefaults";
import {
  downloadBlob,
  generateStationQrPosterBlob,
  slugFromStationQrUrl,
} from "@/lib/generateStationQrPoster";

const APP_DISPLAY_NAME =
  process.env.NEXT_PUBLIC_APP_DISPLAY_NAME?.trim() || "EV Green Station";

function initialDemoQrUrl(): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000");
  return demoStationAbsoluteUrl(base);
}

export default function QrTestPage() {
  const [url, setUrl] = useState(initialDemoQrUrl);
  const demoSlug = resolvedDemoStationSlug();
  const [stationLabel, setStationLabel] = useState(`Trạm · ${demoSlug}`);
  const [posterBusy, setPosterBusy] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);

  useEffect(() => {
    setUrl(demoStationAbsoluteUrl(window.location.origin));
  }, []);

  const normalized = useMemo(() => url.trim(), [url]);

  return (
    <BlobBackground>
      <SiteHeader />
      <main className="flex flex-1 flex-col py-10 sm:py-14">
        <Container className="max-w-4xl">
          <Card className="rounded-tl-[4rem]">
            <CardTitle>QR test</CardTitle>
            <CardMuted>
              Mở trang này trên điện thoại/máy khác, rồi dùng máy khác vào <code>/scan</code> để quét.
              Mặc định QR là trạm <span className="font-mono">/s/{demoSlug}</span> — cùng id trạm demo{" "}
              <span className="font-mono">{DEFAULT_DEMO_STATION_ID}</span> với <code>/api/demo/qr-redirect</code>
              (slug đổi bằng <code>NEXT_PUBLIC_DEMO_STATION_SLUG</code> / <code>DEMO_STATION_SLUG</code>).
            </CardMuted>

            <div className="mt-6 grid gap-3">
              <label className="text-sm font-semibold text-[color:var(--foreground)]">
                URL trong QR
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-12 w-full rounded-full border border-[color:var(--border)] bg-white/50 px-5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]"
                placeholder={demoStationAbsoluteUrl("http://localhost:3000")}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setUrl(demoStationAbsoluteUrl(window.location.origin))}
                >
                  Trạm demo
                </Button>
                <Button size="sm" variant="outline" onClick={() => setUrl(`${window.location.origin}/`)}>
                  Set /
                </Button>
                <Button size="sm" variant="outline" onClick={() => setUrl(`${window.location.origin}/scan`)}>
                  Set /scan
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <label className="text-sm font-semibold text-[color:var(--foreground)]">
                Tên trạm trên ảnh in
              </label>
              <input
                value={stationLabel}
                onChange={(e) => setStationLabel(e.target.value)}
                className="h-12 w-full rounded-full border border-[color:var(--border)] bg-white/50 px-5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]"
                placeholder={`Trạm · ${demoSlug}`}
              />
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Dùng cho poster in / dán trạm (PNG cao 1800px). Có thể đổi theo tên thật của trạm.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  disabled={posterBusy || !normalized}
                  onClick={async () => {
                    setPosterError(null);
                    setPosterBusy(true);
                    try {
                      const blob = await generateStationQrPosterBlob({
                        url: normalized || url,
                        appName: APP_DISPLAY_NAME,
                        stationName: stationLabel.trim() || `Trạm · ${demoSlug}`,
                        widthPx: 1800,
                      });
                      const slug = slugFromStationQrUrl(normalized || url);
                      const safe = slug.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
                      downloadBlob(blob, `poster-qr-${safe}.png`);
                    } catch (e) {
                      setPosterError(e instanceof Error ? e.message : "Không tạo được ảnh");
                    } finally {
                      setPosterBusy(false);
                    }
                  }}
                >
                  {posterBusy ? "Đang tạo ảnh…" : "Tải ảnh in (poster PNG)"}
                </Button>
              </div>
              {posterError ? (
                <p className="text-sm text-[color:var(--destructive)]">{posterError}</p>
              ) : null}
            </div>

            <div className="mt-8 flex justify-center">
              <div className="rounded-[2rem] border border-[color:var(--border)]/60 bg-white/60 p-5 shadow-[var(--shadow-soft)]">
                <QRCodeCanvas value={normalized || url} size={240} />
              </div>
            </div>

            <div className="mt-4 text-center text-sm text-[color:var(--muted-foreground)]">
              {normalized || url}
            </div>
          </Card>
        </Container>
      </main>
    </BlobBackground>
  );
}

