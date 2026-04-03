"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { BrowserQRCodeReader } from "@zxing/browser";

import { navigateAfterQrScan } from "@/lib/qrScanNavigate";
import { BlobBackground } from "@/components/ui/blob-background";
import { Button } from "@/components/ui/button";
import { Card, CardMuted, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { SiteHeader } from "@/components/nav/SiteHeader";

type Detected = { rawValue: string };

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const navigatedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [running, setRunning] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageDecodeError, setImageDecodeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const secureContextHint = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (window.isSecureContext) return null;
    return "Camera thường bị chặn nếu không chạy trên HTTPS (hoặc localhost).";
  }, []);

  const supportsBarcodeDetector = useMemo(
    () => typeof window !== "undefined" && "BarcodeDetector" in window,
    [],
  );

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopZxing: (() => void) | null = null;

    async function start() {
      setError(null);
      setRunning(true);
      try {
        const v = videoRef.current;
        if (!v) return;

        // Prefer ZXing (more reliable across browsers).
        try {
          const codeReader = new BrowserQRCodeReader();

          const controls = await codeReader.decodeFromVideoDevice(
            undefined,
            v,
            (result) => {
              const text = result?.getText?.();
              if (!text || navigatedRef.current) return;
              navigatedRef.current = true;
              void navigateAfterQrScan(text).then((ok) => {
                if (!ok) navigatedRef.current = false;
              });
            },
          );

          stopZxing = () => controls.stop();
          return;
        } catch {
          // Fall back to BarcodeDetector if ZXing fails to init.
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        v.srcObject = stream;
        await v.play();

        if (!supportsBarcodeDetector) return;
        // @ts-expect-error BarcodeDetector is not in TS lib by default
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });

        const scan = async () => {
          try {
            const v2 = videoRef.current;
            if (!v2) return;
            const codes: Detected[] = await detector.detect(v2);
            const first = codes?.[0]?.rawValue;
            if (first && !navigatedRef.current) {
              navigatedRef.current = true;
              void navigateAfterQrScan(first).then((ok) => {
                if (!ok) navigatedRef.current = false;
              });
              return;
            }
          } catch {
            // ignore transient detector errors
          }
          raf = window.requestAnimationFrame(scan);
        };
        raf = window.requestAnimationFrame(scan);
      } catch (e: any) {
        setError(e?.message ?? "Không thể mở camera.");
      }
    }

    void start();

    return () => {
      setRunning(false);
      if (raf) window.cancelAnimationFrame(raf);
      if (stopZxing) stopZxing();
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [supportsBarcodeDetector]);

  const onGalleryImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file?.type.startsWith("image/")) return;

    setImageDecodeError(null);
    setImageBusy(true);
    const blobUrl = URL.createObjectURL(file);
    try {
      const reader = new BrowserQRCodeReader();
      const result = await reader.decodeFromImageUrl(blobUrl);
      const text = result.getText();
      if (!text) {
        setImageDecodeError("Không đọc được nội dung QR.");
        return;
      }
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      const ok = await navigateAfterQrScan(text);
      if (!ok) navigatedRef.current = false;
    } catch {
      setImageDecodeError(
        "Không tìm thấy QR trong ảnh. Chọn ảnh rõ hơn, hoặc dán link ở cột bên phải.",
      );
    } finally {
      URL.revokeObjectURL(blobUrl);
      setImageBusy(false);
    }
  }, []);

  return (
    <BlobBackground>
      <SiteHeader />
      <main className="flex flex-1 flex-col py-10 sm:py-14">
        <Container className="max-w-5xl">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <Card className="rounded-tl-[4rem]">
              <CardTitle>Quét QR</CardTitle>
              <CardMuted>
                Hướng camera vào QR tại trạm. Sau khi đọc được, bạn sẽ vào trang chi tiết
                trạm <strong className="text-foreground">/s/…</strong> để bắt đầu sạc (có mã bảo mật
                trên QR).
              </CardMuted>

              <div className="mt-5 overflow-hidden rounded-[2rem] border border-[color:var(--border)]/60 bg-[color:var(--muted)]/40">
                <video
                  ref={videoRef}
                  className="h-[320px] w-full object-cover"
                  playsInline
                  muted
                />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(ev) => void onGalleryImageChange(ev)}
              />
              <div className="mt-3 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 px-4 text-xs"
                  disabled={imageBusy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4 shrink-0" aria-hidden />
                  Ảnh từ thư viện
                </Button>
              </div>
              {imageDecodeError ? (
                <div className="mt-2 text-center text-xs text-[color:var(--destructive)]">
                  {imageDecodeError}
                </div>
              ) : null}

              <div className="mt-4 text-sm text-[color:var(--muted-foreground)]">
                {supportsBarcodeDetector
                  ? "Đang quét QR…"
                  : "Trình duyệt chưa hỗ trợ QR auto-detect. Bạn vẫn có thể dùng nhập tay hoặc mở camera bằng app khác."}
              </div>
              {secureContextHint ? (
                <div className="mt-3 text-xs text-[color:var(--muted-foreground)]">
                  {secureContextHint}
                </div>
              ) : null}
              {error ? (
                <div className="mt-4 rounded-[1.25rem] border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/10 p-4 text-sm">
                  Lỗi: {error}
                </div>
              ) : null}
            </Card>

            <Card className="rounded-tr-[4rem]">
              <CardTitle>Nhập link QR (fallback)</CardTitle>
              <CardMuted>
                Nếu camera không quét được, bạn dán link từ QR (thường bắt đầu
                bằng <code>https://</code>).
              </CardMuted>

              <div className="mt-5 grid gap-3">
                <input
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="Dán link QR tại đây…"
                  className="h-12 w-full rounded-full border border-[color:var(--border)] bg-white/50 px-5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]"
                />
                <Button
                  onClick={() => {
                    if (!manual.trim()) return;
                    void navigateAfterQrScan(manual.trim());
                  }}
                  disabled={!manual.trim()}
                >
                  Mở trang trạm
                </Button>
              </div>

              <div className="mt-6 rounded-[2rem] border border-[color:var(--border)]/60 bg-white/50 p-5">
                <div className="text-sm text-[color:var(--muted-foreground)]">
                  Trạng thái camera:{" "}
                  <strong className="text-[color:var(--foreground)]">
                    {running ? "Đang chạy" : "Đang dừng"}
                  </strong>
                </div>
              </div>
            </Card>
          </div>
        </Container>
      </main>
    </BlobBackground>
  );
}
