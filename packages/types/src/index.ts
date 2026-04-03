export type Role = "user" | "station_owner" | "admin";

export type ConnectorId = 1;

export type PaymentMethod = "qr_transfer";

export type ChargingSessionStatus = "active" | "completed" | "cancelled";

export type PaymentStatus = "pending" | "confirmed";

export interface StartChargingCommand {
  sessionId: string;
  stationId: string;
  userId: string;
  connectorId: ConnectorId;
}

export interface StopChargingCommand {
  sessionId: string;
  stationId: string;
  connectorId: ConnectorId;
}

export interface OcppStationStatus {
  stationId: string;
  chargePointId: string;
  connectorId: ConnectorId;
  status: "available" | "charging" | "unavailable";
  lastSeenAt: string; // ISO
}

