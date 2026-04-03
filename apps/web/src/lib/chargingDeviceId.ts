const STORAGE_KEY = "evgs_charging_device_id";

/** UUID lưu `localStorage` — gửi lên API start/stop/device cho khách. */
export function getOrCreateChargingDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id?.trim()) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
