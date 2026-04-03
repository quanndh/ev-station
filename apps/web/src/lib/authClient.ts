export type ClientUser = {
  id: string;
  role: "user" | "station_owner" | "admin";
  email: string | null;
  name: string | null;
};

const TOKEN_KEY = "evgs_token";

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function decodeBase64Url(input: string) {
  const b64 = input.replaceAll("-", "+").replaceAll("_", "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const full = b64 + pad;
  // atob expects binary string
  const bin = typeof window !== "undefined" ? window.atob(full) : "";
  // handle UTF-8
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function getTokenRole(): ClientUser["role"] | null {
  const token = getToken();
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payloadStr = decodeBase64Url(parts[1] ?? "");
  const payload = safeJsonParse<{ role?: ClientUser["role"]; exp?: number }>(payloadStr);
  if (!payload?.role) return null;
  if (typeof payload.exp === "number" && Date.now() / 1000 > payload.exp) return null;
  return payload.role;
}

export function getTokenEmail(): string | null {
  const token = getToken();
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payloadStr = decodeBase64Url(parts[1] ?? "");
  const payload = safeJsonParse<{ email?: string | null; exp?: number }>(payloadStr);
  if (typeof payload?.exp === "number" && Date.now() / 1000 > payload.exp) return null;
  return payload?.email ?? null;
}

/** `sub` trong JWT — trùng `userId` phiên sạc khi đăng nhập. */
export function getTokenSubject(): string | null {
  const token = getToken();
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payloadStr = decodeBase64Url(parts[1] ?? "");
  const payload = safeJsonParse<{ sub?: string; exp?: number }>(payloadStr);
  if (!payload?.sub) return null;
  if (typeof payload.exp === "number" && Date.now() / 1000 > payload.exp) return null;
  return payload.sub;
}

export async function login(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Login failed");
  setToken(data.token);
  return data.user as ClientUser;
}

export async function me(): Promise<ClientUser> {
  const token = getToken();
  if (!token) throw new Error("No token");
  const res = await fetch("/api/auth/me", {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Unauthorized");
  return data.user as ClientUser;
}

export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getToken();
  if (!token) throw new Error("No token");
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers, cache: "no-store" });
}

/** `Content-Type: application/json` + Bearer nếu đã đăng nhập qua `/api/auth/login` (JWT localStorage). */
export function jsonHeadersWithOptionalBearer(): HeadersInit {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

/** GET/poll: Bearer nếu có JWT (API vừa nhận cookie NextAuth vừa nhận Bearer). */
export function headersWithOptionalBearer(): HeadersInit {
  const token = getToken();
  if (!token) return {};
  return { authorization: `Bearer ${token}` };
}

