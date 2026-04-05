import { prisma } from "@ev/db";
import { verifyJwt } from "@/lib/jwt";
import { touchUserLastSeenThrottled } from "@/lib/userLastSeen";

export function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

/** Xác thực JWT; bắn cập nhật `User.updatedAt` (giới hạn tần suất) để admin xem “online lần cuối”. */
export async function requireApiUser(req: Request) {
  const token = getBearerToken(req);
  if (!token) return null;
  const u = verifyJwt(token);
  if (u) touchUserLastSeenThrottled(u.sub);
  return u;
}

async function assertJwtUserNotOwnerOrAdminDisabled(sub: string, role: string) {
  if (role !== "station_owner" && role !== "admin") return true;
  const row = await prisma.user.findUnique({
    where: { id: sub },
    select: { disabledAt: true },
  });
  return !row?.disabledAt;
}

export async function requireApiRole(req: Request, allowed: Array<"user" | "station_owner" | "admin">) {
  const u = await requireApiUser(req);
  if (!u) return null;
  if (!allowed.includes(u.role)) return null;
  if (!(await assertJwtUserNotOwnerOrAdminDisabled(u.sub, u.role))) return null;
  return u;
}

