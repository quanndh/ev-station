import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getBearerToken } from "@/lib/apiAuth";
import { verifyJwt } from "@/lib/jwt";
import { getOrCreateChargingUserForDevice, validateChargingDeviceId } from "@/lib/chargingDeviceUser";
import { prisma } from "@ev/db";
import type { Role } from "@ev/types";

export type UserSession = Awaited<ReturnType<typeof auth>>["user"];

const CHARGING_ROLES: Role[] = ["user", "station_owner", "admin"];

/** Session hiện tại (không redirect) — dùng cho Route Handler. */
export async function getSessionUserOptional() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as { id: string; role: Role; email?: string | null };
}

/**
 * Người được phép bắt đầu/kết thúc sạc (trả null → 401).
 * Ưu tiên JWT Bearer (login `/api/auth/login` lưu localStorage), không có thì dùng session NextAuth.
 */
export async function requireChargingUserForApi(req: Request) {
  const bearer = getBearerToken(req);
  if (bearer) {
    const jwt = verifyJwt(bearer);
    if (!jwt || !CHARGING_ROLES.includes(jwt.role)) return null;
    return { id: jwt.sub, role: jwt.role, email: jwt.email ?? null };
  }

  const user = await getSessionUserOptional();
  if (!user) return null;
  if (!CHARGING_ROLES.includes(user.role)) return null;
  return user;
}

export type ChargingActorError = { error: string; status: number };

/**
 * `userId` gán phiên sạc: Bearer/cookie nếu có; khách bắt buộc `deviceId` hợp lệ (một user ẩn danh / thiết bị).
 */
export async function resolveChargingActorUserId(
  req: Request,
  guestDeviceId?: string | null,
): Promise<{ userId: string } | ChargingActorError> {
  const u = await requireChargingUserForApi(req);
  if (u) return { userId: u.id };
  const id = validateChargingDeviceId(guestDeviceId?.trim() ?? "");
  if (!id) {
    return { error: "deviceId is required for guest charging", status: 400 };
  }
  const userId = await getOrCreateChargingUserForDevice(id);
  return { userId };
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user as { id: string; role: Role; email?: string | null };
}

export async function requireRole(...allowed: Role[]) {
  const user = await requireUser();
  if (!allowed.includes(user.role)) throw new Error("Forbidden");
  return user;
}

export async function assertStationOwner(stationId: string) {
  const user = await requireUser();
  if (user.role === "admin") return;

  const station = await prisma.station.findUnique({
    where: { id: stationId },
    select: { ownerId: true },
  });

  if (!station || station.ownerId !== user.id) throw new Error("Forbidden");
}

