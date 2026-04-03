import crypto from "node:crypto";

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(input: string) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replaceAll("-", "+").replaceAll("_", "/") + pad;
  return Buffer.from(b64, "base64").toString("utf8");
}

function hmacSha256(secret: string, payload: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Thời điểm hết hạn (epoch ms) cho token QR trạm.
 * `QR_STATION_TOKEN_TTL_DAYS` — số ngày hiệu lực kể từ lúc tạo; mặc định 365 (1 năm). Tối đa 3650 ngày.
 */
export function qrStationTokenExpMs(): number {
  const raw = process.env.QR_STATION_TOKEN_TTL_DAYS;
  let days = 365;
  if (raw != null && String(raw).trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) days = Math.min(Math.floor(n), 3650);
  }
  return Date.now() + days * MS_PER_DAY;
}

export function signStationToken(stationId: string, expMs: number) {
  const secret = process.env.QR_SECRET;
  if (!secret) throw new Error("Missing QR_SECRET env var");

  // Giảm độ dài token: dùng epoch (giây) thay vì ms trong payload.
  // Verify sẽ tự nhận diện cả định dạng cũ (ms) và mới (s).
  const expSec = Math.floor(expMs / 1000);
  const payload = `${stationId}:${expSec}`;
  const sig = hmacSha256(secret, payload);
  return `${base64UrlEncode(payload)}.${base64UrlEncode(sig)}`;
}

export function verifyStationToken(token: string) {
  const secret = process.env.QR_SECRET;
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  try {
    const payload = base64UrlDecode(parts[0]);
    const sig = base64UrlDecode(parts[1]);
    const expectedSig = hmacSha256(secret, payload);
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;

    const [stationId, expStr] = payload.split(":");
    const expNum = Number(expStr);
    if (!stationId || !Number.isFinite(expNum)) return null;
    // Token cũ lưu expMs (13 chữ số), token mới lưu expSec (10 chữ số).
    const expMs = expStr.length <= 10 ? expNum * 1000 : expNum;
    if (Date.now() > expMs) return null;

    return { stationId };
  } catch {
    return null;
  }
}

