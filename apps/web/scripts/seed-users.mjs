/**
 * Chỉ tạo/cập nhật 3 user mật khẩu. Dữ liệu đầy đủ (trạm, session, payment, giá, OCPP): `pnpm db:seed`.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import bcrypt from "bcryptjs";

function loadDotenv(envPath) {
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
loadDotenv(path.join(repoRoot, ".env"));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL. Put it in .env or pass via env var.");
}

// Work around restricted cache locations by redirecting Prisma engine cache.
const tmpHome = path.join(repoRoot, ".tmp_prisma_home");
const tmpCacheHome = path.join(tmpHome, ".cache");
const prismaEnv = {
  ...process.env,
  HOME: tmpHome,
  XDG_CACHE_HOME: tmpCacheHome,
};

// Ensure Prisma client is generated before importing @ev/db.
execSync("pnpm -C packages/db generate", {
  cwd: repoRoot,
  env: prismaEnv,
  stdio: "inherit",
});

const { prisma } = await import("@ev/db");

const admin = {
  email: process.env.ADMIN_EMAIL ?? "admin@local",
  name: process.env.ADMIN_NAME ?? "Admin",
  role: "admin",
  password: process.env.ADMIN_PASSWORD ?? "admin123",
};

const stationOwner = {
  email: process.env.OWNER_EMAIL ?? "owner@local",
  name: process.env.OWNER_NAME ?? "Owner",
  role: "station_owner",
  password: process.env.OWNER_PASSWORD ?? "owner123",
};

const user = {
  email: process.env.USER_EMAIL ?? "user@local",
  name: process.env.USER_NAME ?? "User",
  role: "user",
  password: process.env.USER_PASSWORD ?? "user123",
};

const guestCharging = {
  email: process.env.GUEST_CHARGING_USER_EMAIL ?? "guest-charging@local",
  name: "Khách sạc (QR)",
  role: "user",
};

await prisma.user.upsert({
  where: { email: guestCharging.email },
  update: { name: guestCharging.name, role: guestCharging.role, passwordHash: null },
  create: {
    email: guestCharging.email,
    name: guestCharging.name,
    role: guestCharging.role,
    passwordHash: null,
  },
});

const users = [admin, stationOwner, user];

for (const u of users) {
  const passwordHash = bcrypt.hashSync(u.password, 10);
  await prisma.user.upsert({
    where: { email: u.email },
    update: { name: u.name, role: u.role, passwordHash },
    create: { email: u.email, name: u.name, role: u.role, passwordHash },
  });
}

await prisma.$disconnect();
console.log("Seed users done.");

