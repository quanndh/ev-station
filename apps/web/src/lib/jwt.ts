import crypto from "node:crypto";

function base64UrlEncode(buf: Buffer) {
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlEncodeJson(obj: any) {
  return base64UrlEncode(Buffer.from(JSON.stringify(obj), "utf8"));
}

function base64UrlDecodeToString(input: string) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replaceAll("-", "+").replaceAll("_", "/") + pad;
  return Buffer.from(b64, "base64").toString("utf8");
}

function hmacSha256(secret: string, data: string) {
  return crypto.createHmac("sha256", secret).update(data).digest();
}

export type JwtPayload = {
  sub: string; // userId
  role: "user" | "station_owner" | "admin";
  email?: string | null;
  name?: string | null;
  iat: number;
  exp: number;
};

export function signJwt(payload: Omit<JwtPayload, "iat" | "exp">, ttlSeconds: number) {
  const secret = process.env.AUTH_SECRET ?? "dev-secret";
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const full: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };

  const h = base64UrlEncodeJson(header);
  const p = base64UrlEncodeJson(full);
  const toSign = `${h}.${p}`;
  const sig = base64UrlEncode(hmacSha256(secret, toSign));
  return `${toSign}.${sig}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  const secret = process.env.AUTH_SECRET ?? "dev-secret";
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const toSign = `${h}.${p}`;
  const expected = base64UrlEncode(hmacSha256(secret, toSign));
  if (expected.length !== s.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(s))) return null;

  try {
    const payload = JSON.parse(base64UrlDecodeToString(p)) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || now > payload.exp) return null;
    if (!payload.sub || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}

