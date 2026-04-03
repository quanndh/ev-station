/**
 * Trích path nội bộ `/s/[slug]` (và `?t=` nếu có) từ chuỗi QR / URL.
 * Trả về path + search (bắt đầu bằng `/`) hoặc null.
 */
export function normalizeQrToStationPath(raw: string, currentOrigin: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    try {
      url = new URL(trimmed, currentOrigin);
    } catch {
      return null;
    }
  }

  const pathMatch = url.pathname.match(/^\/s\/([^/]+)\/?$/);
  if (pathMatch) {
    const slug = decodeURIComponent(pathMatch[1]);
    const t = url.searchParams.get("t");
    const qs = t ? `?t=${encodeURIComponent(t)}` : "";
    return `/s/${encodeURIComponent(slug)}${qs}`;
  }

  // Chỉ slug (ví dụ dán tay), cùng quy tắc slug trạm
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(trimmed) && trimmed.length <= 160) {
    return `/s/${encodeURIComponent(trimmed)}`;
  }

  return null;
}

function demoModeClient() {
  const v = process.env.NEXT_PUBLIC_DEMO_MODE;
  return v === "true" || v === "1";
}

/**
 * Điều hướng sau quét QR.
 * Khi demo (`NEXT_PUBLIC_DEMO_MODE`): **luôn** chỉ đi tới trạm demo — không mở URL vừa quét.
 * Thứ tự: API `/api/demo/qr-redirect` → `NEXT_PUBLIC_DEMO_STATION_SLUG` (fallback khi API lỗi/sai id).
 * Trả về `true` nếu đã gán `location.href`.
 */
export async function navigateAfterQrScan(raw: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (demoModeClient()) {
    let path: string | null = null;
    try {
      const res = await fetch("/api/demo/qr-redirect", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { path?: string };
        if (data.path) path = data.path;
      }
    } catch {
      /* ignore */
    }

    const slugFallback = process.env.NEXT_PUBLIC_DEMO_STATION_SLUG?.trim();
    if (!path && slugFallback) {
      path = `/s/${encodeURIComponent(slugFallback)}`;
    }

    if (path) {
      window.location.href = path;
      return true;
    }
    return false;
  }

  const internal = normalizeQrToStationPath(raw, window.location.origin);
  if (internal) {
    window.location.href = internal;
    return true;
  }
  const t = raw.trim();
  if (t) {
    window.location.href = t;
    return true;
  }
  return false;
}
