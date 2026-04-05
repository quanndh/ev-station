export const MSG_CONTACT_SUPPORT_CHARGING = "Không thể sạc. Liên hệ hỗ trợ.";

export const MSG_ACCOUNT_DISABLED_LOGIN = "Tài khoản đã vô hiệu.";

export type ChargingBlockReason =
  | "user_disabled"
  | "station_disabled"
  | "owner_account_disabled";

export type StationForChargingGate = {
  disabledAt: Date | null;
  disabledBy: "owner" | "admin" | null;
  owner: { disabledAt: Date | null } | null;
};

/** Trạm không nhận phiên sạc mới (trạm khóa hoặc chủ trạm bị khóa). */
export function isStationChargingBlocked(s: StationForChargingGate): boolean {
  if (s.disabledAt) return true;
  if (s.owner?.disabledAt) return true;
  return false;
}

export function chargingBlockReasonForStation(s: StationForChargingGate): ChargingBlockReason | null {
  if (!isStationChargingBlocked(s)) return null;
  if (s.owner?.disabledAt) return "owner_account_disabled";
  if (s.disabledAt) return "station_disabled";
  return null;
}
