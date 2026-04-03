function demoEnvOn() {
  return (
    process.env.DEMO_MODE === "true" ||
    process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  );
}

/**
 * Bỏ qua gọi OCPP (demo / không có trạm thật).
 * Đặt `CHARGING_SKIP_OCPP=false` để vẫn dùng OCPP dù bật DEMO_MODE (chỉ demo QR).
 *
 * **Dev:** không set `OCPP_SERVICE_URL` và `NODE_ENV` ≠ production → tự bỏ qua (tránh 503 khi chưa chạy CSMS).
 */
export function chargingSkipOcpp(): boolean {
  if (process.env.CHARGING_SKIP_OCPP === "false") return false;
  if (process.env.CHARGING_SKIP_OCPP === "true") return true;
  if (demoEnvOn()) return true;
  const hasOcppUrl = Boolean(process.env.OCPP_SERVICE_URL?.trim());
  if (process.env.NODE_ENV !== "production" && !hasOcppUrl) return true;
  return false;
}

/**
 * Cho phép vào `/s/[slug]` (ChargingPanel) **không cần** `?t=` trên URL.
 * Production: tắt demo và CHARGING_SKIP_OCPP → bắt buộc QR có token ký (admin).
 * Ghi đè tuyệt đối: `STATION_QR_REQUIRE_TOKEN=true`.
 */
export function bypassStationSignedQrToken(): boolean {
  if (process.env.STATION_QR_REQUIRE_TOKEN === "true") return false;
  if (process.env.CHARGING_SKIP_OCPP === "true") return true;
  return demoEnvOn();
}
