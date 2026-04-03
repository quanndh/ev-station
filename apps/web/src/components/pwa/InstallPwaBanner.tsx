"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { LogoMark } from "@/components/brand/LogoMark";
import { Container } from "@/components/ui/container";
import { APP_BRAND_NAME } from "@/lib/appBrand";

const STORAGE_SNOOZE_UNTIL = "evgs_pwa_install_snooze_until";
const SHOW_DELAY_MS = 2200;
/** Chờ thêm nếu `beforeinstallprompt` tới trễ — vẫn hiện dải banner ở đầu body. */
const INSTALL_BANNER_FALLBACK_EXTRA_MS = 5500;
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

export function InstallPwaBanner() {
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [forceBanner, setForceBanner] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideForMonth = useCallback(() => {
    writeSnoozeOneMonth();
    setEntered(false);
    setOpen(false);
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

    if (deferredPrompt) {
      showTimerRef.current = setTimeout(tryShow, SHOW_DELAY_MS);
      return () => {
        if (showTimerRef.current) clearTimeout(showTimerRef.current);
      };
    }

    fallbackTimerRef.current = setTimeout(
      tryShow,
      SHOW_DELAY_MS + INSTALL_BANNER_FALLBACK_EXTRA_MS,
    );
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [deferredPrompt, forceBanner, tryShow]);

  async function onInstallClick() {
    if (!deferredPrompt) return;
    const dp = deferredPrompt;
    setDeferredPrompt(null);
    setEntered(false);
    setOpen(false);
    await dp.prompt();
  }

  if (!open) return null;

  const canNativeInstall = !!deferredPrompt;

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
              disabled={!canNativeInstall}
              title={
                canNativeInstall
                  ? undefined
                  : "Đợi trình duyệt sẵn sàng — sẽ mở cửa sổ Cài đặt của Chrome/Edge"
              }
              onClick={() => void onInstallClick()}
              className={[
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition active:scale-[0.98] sm:px-4 sm:py-2 sm:text-sm",
                canNativeInstall
                  ? "bg-white text-[color:var(--primary)] hover:bg-white/95"
                  : "cursor-not-allowed bg-white/35 text-white/80",
              ].join(" ")}
            >
              Cài đặt
            </button>
            <button
              type="button"
              onClick={hideForMonth}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/25 transition hover:bg-white/25"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
        {forceBanner ? (
          <p className="mt-2 border-t border-white/20 pt-2 text-[10px] text-white/70">
            Thử: <code className="rounded bg-black/15 px-1">?pwaBanner=1</code> — nút chỉ bật khi có{" "}
            <code className="rounded bg-black/15 px-1">beforeinstallprompt</code> (HTTPS, đủ điều kiện PWA).
          </p>
        ) : null}
        </div>
      </Container>
    </div>
  );
}
