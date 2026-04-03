/** Đồng bộ với `GET /api/demo/qr-redirect` (DEMO_STATION_ID mặc định). */
export const DEFAULT_DEMO_STATION_ID = "cmnief5xb00089k8dhg75lb17";

/** Slug mặc định cho QR test / fallback client khi chưa có env. */
export const DEFAULT_DEMO_STATION_SLUG = "seed-tram-1";

export function resolvedDemoStationSlug(): string {
  return (
    process.env.NEXT_PUBLIC_DEMO_STATION_SLUG?.trim() || DEFAULT_DEMO_STATION_SLUG
  );
}

export function demoStationPath(slug: string = resolvedDemoStationSlug()): string {
  return `/s/${encodeURIComponent(slug.trim() || DEFAULT_DEMO_STATION_SLUG)}`;
}

/** URL tuyệt đối tới trang trạm demo (để in QR). */
export function demoStationAbsoluteUrl(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${demoStationPath()}`;
}
