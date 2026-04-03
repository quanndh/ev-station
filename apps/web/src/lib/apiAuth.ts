import { verifyJwt } from "@/lib/jwt";

export function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export function requireApiUser(req: Request) {
  const token = getBearerToken(req);
  if (!token) return null;
  return verifyJwt(token);
}

export function requireApiRole(req: Request, allowed: Array<"user" | "station_owner" | "admin">) {
  const u = requireApiUser(req);
  if (!u) return null;
  if (!allowed.includes(u.role)) return null;
  return u;
}

