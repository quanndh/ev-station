"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { LogoMark } from "@/components/brand/LogoMark";
import { Button } from "@/components/ui/button";
import { APP_BRAND_NAME, APP_BRAND_SHORT_NAME } from "@/lib/appBrand";

const STORAGE_SNOOZE_UNTIL = "evgs_pwa_install_snooze_until";
const SHOW_DELAY_MS = 2200;
/** Android/Chrome: chờ thêm trước khi gợi ý thủ công (nhiều máy bắn `beforeinstallprompt` trễ). */
const MOBILE_FALLBACK_EXTRA_MS = 5500;
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

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

function readSnoozeUntil(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_SNOOZE_UNTIL);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeSnoozeOneMonth() {
  try {
    localStorage.setItem(STORAGE_SNOOZE_UNTIL, String(Date.now() + SNOOZE_MS));
  } catch {
    /* ignore */
  }
}

function isLikelyIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  return false;
}

export function InstallPwaBanner() {
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [forceBanner, setForceBanner] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideForMonth = useCallback(() => {
    writeSnoozeOneMonth();
    setEntered(false);
    window.setTimeout(() => setOpen(false), 280);
  }, []);

  const tryShow = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!forceBanner && !window.isSecureContext) return;
    if (isInstalledPwa()) return;
    if (!forceBanner) {
      const until = readSnoozeUntil();
      if (until != null && Date.now() < until) return;
    }
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
    if (!forceBanner) {
      const until = readSnoozeUntil();
      if (until != null && Date.now() < until) return;
    }

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
    if (!forceBanner) {
      const until = readSnoozeUntil();
      if (until != null && Date.now() < until) return;
    }

    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);

    if (forceBanner) {
      showTimerRef.current = setTimeout(tryShow, 600);
      return () => {
        if (showTimerRef.current) clearTimeout(showTimerRef.current);
      };
    }

    if (isIos) {
      showTimerRef.current = setTimeout(tryShow, SHOW_DELAY_MS);
      return () => {
        if (showTimerRef.current) clearTimeout(showTimerRef.current);
      };
    }

    if (deferredPrompt) {
      showTimerRef.current = setTimeout(tryShow, SHOW_DELAY_MS);
      return () => {
        if (showTimerRef.current) clearTimeout(showTimerRef.current);
      };
    }

    // Chrome đôi khi không bắn `beforeinstallprompt` (localhost, chưa đủ điều kiện PWA…). Vẫn hiện gợi ý cài thủ công.
    fallbackTimerRef.current = setTimeout(tryShow, SHOW_DELAY_MS + MOBILE_FALLBACK_EXTRA_MS);
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [deferredPrompt, isIos, forceBanner, tryShow]);

  async function onInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    setDeferredPrompt(null);
    setEntered(false);
    window.setTimeout(() => setOpen(false), 280);
  }

  if (!open) return null;

  const showManualNonIos = !deferredPrompt && !isIos;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[95] flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
      aria-hidden={!entered}
    >
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="pwa-install-title"
        className={[
          "pointer-events-auto w-full max-w-lg rounded-b-[var(--radius-card-lg)] border border-[color:var(--border)]/80",
          "bg-[color:var(--background)] px-4 pb-4 pt-3 shadow-[var(--shadow-float)] transition-transform duration-300 ease-out",
          entered ? "translate-y-0" : "-translate-y-[calc(100%+1rem)]",
        ].join(" ")}
      >
        <div className="flex gap-3">
          <LogoMark className="h-11 w-11 shrink-0" />
          <div className="min-w-0 flex-1">
            <p id="pwa-install-title" className="font-serif text-base font-extrabold text-[color:var(--foreground)]">
              Thêm {APP_BRAND_SHORT_NAME} vào màn hình chính
            </p>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
              Mở nhanh như ứng dụng, không cần gõ địa chỉ mỗi lần.
            </p>
            {isIos && !deferredPrompt ? (
              <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
                Trên Safari: nhấn <strong className="text-[color:var(--foreground)]">Chia sẻ</strong> (vuông có mũi tên)
                rồi chọn <strong className="text-[color:var(--foreground)]">Thêm vào Màn hình chính</strong>.
              </p>
            ) : null}
            {showManualNonIos ? (
              <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
                Trên Chrome / Edge: mở menu <strong className="text-[color:var(--foreground)]">⋮</strong> (ba chấm) →{" "}
                <strong className="text-[color:var(--foreground)]">Cài đặt ứng dụng</strong> hoặc{" "}
                <strong className="text-[color:var(--foreground)]">Thêm vào Màn hình chính</strong>.
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {deferredPrompt ? (
            <Button type="button" size="md" onClick={() => void onInstallClick()}>
              Cài {APP_BRAND_NAME}
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="md" onClick={hideForMonth}>
            Để sau
          </Button>
        </div>
        {forceBanner ? (
          <p className="mt-2 text-[10px] text-[color:var(--muted-foreground)]">
            Chế độ thử: thêm <code className="rounded bg-[color:var(--muted)]/50 px-1">?pwaBanner=1</code> hoặc{" "}
            <code className="rounded bg-[color:var(--muted)]/50 px-1">NEXT_PUBLIC_DEBUG_PWA_BANNER</code>.
          </p>
        ) : null}
      </div>
    </div>
  );
}
