export type StationManageActor = { sub: string; role: "admin" | "station_owner" };

/** Dùng chung với JWT sau `requireApiRole(…, ["admin","station_owner"])` — role `user` luôn false. */
export function canViewStationSessions(
  actor: { sub: string; role: "user" | "station_owner" | "admin" },
  station: { ownerId: string | null },
): boolean {
  if (actor.role === "admin") return true;
  if (actor.role === "station_owner") return station.ownerId === actor.sub;
  return false;
}

/** Chủ trạm: chỉ trạm của mình. Admin: chỉ trạm chưa gán chủ. */
export function canStopChargingOnStation(
  actor: { sub: string; role: "user" | "station_owner" | "admin" },
  station: { ownerId: string | null },
): boolean {
  if (actor.role === "station_owner") return station.ownerId === actor.sub;
  if (actor.role === "admin") return station.ownerId === null;
  return false;
}
