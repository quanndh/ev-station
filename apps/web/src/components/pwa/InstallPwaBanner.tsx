"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { LogoMark } from "@/components/brand/LogoMark";
import { Container } from "@/components/ui/container";
import { APP_BRAND_NAME } from "@/lib/appBrand";

/** Trễ ngắn để trang ổn định; hiển thị cùng tốc độ dù đã có `beforeinstallprompt` hay chưa. */
const SHOW_DELAY_MS = 2200;

const DEBUG_PUBLIC = process.env.NEXT_PUBLIC_DEBUG_PWA_BANNER === "true";

/** Chromium: not in all `lib.dom` versions this repo uses */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isInstalledPwa(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return false;
}

/** Mọi trình duyệt trên iPhone (kể cả Chrome) đều WebKit — không có `beforeinstallprompt`. */
function isLikelyIos(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  return false;
}

export function InstallPwaBanner() {
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [forceBanner, setForceBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [iosStepsOpen, setIosStepsOpen] = useState(false);
  const iosStepsRef = useRef<HTMLDivElement>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  /** Chỉ ẩn phiên hiện tại; không lưu localStorage — lần vào/đổi route sau vẫn hiện lại. */
  const dismissBanner = useCallback(() => {
    setEntered(false);
    setOpen(false);
  }, []);

  const tryShow = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!forceBanner && !window.isSecureContext) return;
    if (isInstalledPwa()) return;
    setEntered(false);
    setOpen(true);
  }, [forceBanner]);

  useLayoutEffect(() => {
    setIsIos(isLikelyIos());
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (DEBUG_PUBLIC || sp.get("pwaBanner") === "1") setForceBanner(true);
  }, []);

  useEffect(() => {
    if (open) setIosStepsOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!forceBanner && !window.isSecureContext) return;
    if (isInstalledPwa()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    const onInstalled = () => {
      setOpen(false);
      setEntered(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [forceBanner]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!forceBanner && !window.isSecureContext) return;
    if (isInstalledPwa()) return;

    if (showTimerRef.current) clearTimeout(showTimerRef.current);

    const delay = forceBanner ? 600 : SHOW_DELAY_MS;
    showTimerRef.current = setTimeout(tryShow, delay);
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, [forceBanner, tryShow, pathname]);

  async function onInstallClick() {
    if (deferredPrompt) {
      const dp = deferredPrompt;
      setDeferredPrompt(null);
      setEntered(false);
      setOpen(false);
      await dp.prompt();
      return;
    }
    if (isIos) {
      setIosStepsOpen(true);
      requestAnimationFrame(() => {
        iosStepsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }

  if (!open) return null;

  const canNativeInstall = !!deferredPrompt;
  const installEnabled = canNativeInstall || isIos;

  return (
    <div
      className="shrink-0 w-full pt-[max(0.5rem,env(safe-area-inset-top))] pb-2"
      aria-hidden={!entered}
    >
      <Container>
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="pwa-install-title"
          className={[
            "rounded-2xl px-3 py-2.5 shadow-[0_4px_18px_-2px_rgba(0,0,0,0.18)] transition-[transform,opacity] duration-300 ease-out sm:px-4 sm:py-3",
            "bg-gradient-to-r from-[color:var(--primary)] to-[#3d4a38] text-[color:var(--primary-foreground)]",
            entered ? "translate-y-0 opacity-100" : "-translate-y-1.5 opacity-0",
          ].join(" ")}
        >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="shrink-0 rounded-xl bg-white p-1 ring-1 ring-white/40">
            <LogoMark className="h-8 w-8 sm:h-9 sm:w-9" title={APP_BRAND_NAME} />
          </div>
          <div className="min-w-0 flex-1">
            <p id="pwa-install-title" className="font-serif text-sm font-bold leading-tight sm:text-base">
              Cài đặt ứng dụng
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-white/85 sm:text-xs">
              Cài đặt {APP_BRAND_NAME} để mở nhanh hơn và gọn như app trên màn hình chính.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              disabled={!installEnabled}
              aria-expanded={isIos ? iosStepsOpen : undefined}
              title={
                installEnabled
                  ? undefined
                  : "Trình duyệt desktop: đợi Chrome bật lựa chọn cài ứng dụng"
              }
              onClick={() => void onInstallClick()}
              className={[
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition active:scale-[0.98] sm:px-4 sm:py-2 sm:text-sm",
                installEnabled
                  ? "bg-white text-[color:var(--primary)] hover:bg-white/95"
                  : "cursor-not-allowed bg-white/35 text-white/80",
              ].join(" ")}
            >
              Cài đặt
            </button>
            <button
              type="button"
              onClick={dismissBanner}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/25 transition hover:bg-white/25"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
        {isIos && iosStepsOpen ? (
          <div
            ref={iosStepsRef}
            className="mt-2 border-t border-white/25 pt-2 text-[11px] leading-snug text-white/90 sm:text-xs"
          >
            <p className="font-semibold text-white">Trên iPhone (kể cả Chrome)</p>
            <p className="mt-1">
              Apple không cho phép hộp thoại “Cài đặt” như trên Android. Bạn cần thêm trang vào Màn hình chính
              thủ công:
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 marker:text-white/90">
              <li>
                Chạm <strong className="text-white">Chia sẻ</strong>{" "}
                <span className="whitespace-nowrap">(ô vuông + mũi tên lên)</span> ở thanh dưới Safari, hoặc menu{" "}
                <strong className="text-white">Chia sẻ</strong> trong Chrome.
              </li>
              <li>
                Cuộn xuống và chọn <strong className="text-white">Thêm vào Màn hình chính</strong>.
              </li>
            </ol>
            <p className="mt-2 text-white/80">
              Nếu Chrome không có mục đó, hãy mở cùng địa chỉ trong <strong className="text-white">Safari</strong> rồi
              làm hai bước trên.
            </p>
          </div>
        ) : null}
        {forceBanner ? (
          <p className="mt-2 border-t border-white/20 pt-2 text-[10px] text-white/70">
            Thử: <code className="rounded bg-black/15 px-1">?pwaBanner=1</code> — trên Android / Chrome máy tính nút mở{" "}
            <code className="rounded bg-black/15 px-1">beforeinstallprompt</code>; trên iPhone không có (WebKit).
          </p>
        ) : null}
        </div>
      </Container>
    </div>
  );
}
