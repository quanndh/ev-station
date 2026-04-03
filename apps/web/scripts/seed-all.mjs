/**
 * Full demo seed: users, global price, stations (owner), sessions, payments, OcppEvent.
 * Idempotent for seed-owned rows (slug prefix seed-tram-*, OCPP ids seed-cp-*).
 *
 * Skips NextAuth-only tables (Account, Session, VerificationToken) — empty unless OAuth/email flow.
 *
 * Trạm seed luôn có ownerId = user station_owner (OWNER_EMAIL). Mặc định gán thêm owner đó cho mọi
 * Station còn ownerId null (trạm tạo từ admin trước đó). Tắt: SEED_BACKFILL_STATION_OWNERS=0
 *
 * Usage (repo root):
 *   pnpm db:seed
 *   # or
 *   pnpm exec prisma db seed --schema=packages/db/prisma/schema.prisma
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

const tmpHome = path.join(repoRoot, ".tmp_prisma_home");
const tmpCacheHome = path.join(tmpHome, ".cache");
const prismaEnv = {
  ...process.env,
  HOME: tmpHome,
  XDG_CACHE_HOME: tmpCacheHome,
};

execSync("pnpm -C packages/db generate", {
  cwd: repoRoot,
  env: prismaEnv,
  stdio: "inherit",
});

const { prisma } = await import("@ev/db");

const SEED_STATION_SLUGS = ["seed-tram-1", "seed-tram-2", "seed-tram-3"];
const SEED_CP_IDS = ["seed-cp-1", "seed-cp-2", "seed-cp-3"];

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

const endUser = {
  email: process.env.USER_EMAIL ?? "user@local",
  name: process.env.USER_NAME ?? "User",
  role: "user",
  password: process.env.USER_PASSWORD ?? "user123",
};

/** Phiên sạc không đăng nhập gắn vào user này (apps/web/src/lib/guestChargingUser.ts). */
const guestCharging = {
  email: process.env.GUEST_CHARGING_USER_EMAIL ?? "guest-charging@local",
  name: "Khách sạc (QR)",
  role: "user",
  passwordHash: null,
};

async function seedUsers() {
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

  for (const u of [admin, stationOwner, endUser]) {
    const passwordHash = bcrypt.hashSync(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash },
      create: { email: u.email, name: u.name, role: u.role, passwordHash },
    });
  }
}

async function seedGlobalPrice() {
  const price = Number(process.env.SEED_GLOBAL_PRICE_VND_PER_KWH ?? 3500);
  await prisma.globalPricePolicy.upsert({
    where: { id: 1 },
    update: { priceVndPerKwh: price },
    create: { id: 1, priceVndPerKwh: price },
  });
}

async function clearSeedDerivedRows(stationIds) {
  if (stationIds.length > 0) {
    await prisma.payment.deleteMany({
      where: { chargingSession: { stationId: { in: stationIds } } },
    });
    await prisma.chargingSession.deleteMany({
      where: { stationId: { in: stationIds } },
    });
  }
  await prisma.ocppEvent.deleteMany({
    where: {
      OR: [
        ...(stationIds.length > 0 ? [{ stationId: { in: stationIds } }] : []),
        { chargePointId: { in: SEED_CP_IDS } },
      ],
    },
  });
}

async function backfillStationsWithoutOwner(ownerId) {
  const enabled = process.env.SEED_BACKFILL_STATION_OWNERS !== "0";
  if (!enabled) return 0;
  const r = await prisma.station.updateMany({
    where: { ownerId: null },
    data: { ownerId },
  });
  return r.count;
}

async function seedStations(ownerId) {
  const defs = [
    {
      slug: SEED_STATION_SLUGS[0],
      name: "Trạm mẫu 1 (seed)",
      ocppChargePointId: SEED_CP_IDS[0],
      defaultPriceVndPerKwh: 3200,
    },
    {
      slug: SEED_STATION_SLUGS[1],
      name: "Trạm mẫu 2 (seed)",
      ocppChargePointId: SEED_CP_IDS[1],
      defaultPriceVndPerKwh: null,
    },
    {
      slug: SEED_STATION_SLUGS[2],
      name: "Trạm mẫu 3 (seed, có owner)",
      ocppChargePointId: SEED_CP_IDS[2],
      defaultPriceVndPerKwh: 3400,
    },
  ];
  const stations = [];
  for (const s of defs) {
    const row = await prisma.station.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        ownerId,
        ocppChargePointId: s.ocppChargePointId,
        defaultPriceVndPerKwh: s.defaultPriceVndPerKwh,
        lastSeenAt: new Date(),
      },
      create: {
        name: s.name,
        slug: s.slug,
        ownerId,
        ocppChargePointId: s.ocppChargePointId,
        ocppConnectorId: 1,
        defaultPriceVndPerKwh: s.defaultPriceVndPerKwh,
        lastSeenAt: new Date(),
      },
    });
    stations.push(row);
  }
  return stations;
}

async function seedSessionsPaymentsAndEvents(st1, st2, userId, adminUserId) {
  const ended = new Date(Date.now() - 3600_000);

  const sessionConfirmed = await prisma.chargingSession.create({
    data: {
      userId,
      stationId: st1.id,
      status: "completed",
      connectorId: 1,
      startedAt: new Date(ended.getTime() - 7200_000),
      endedAt: ended,
      kWh: "12.5",
      amountVnd: 43750,
      paymentStatus: "confirmed",
    },
  });

  await prisma.payment.create({
    data: {
      sessionId: sessionConfirmed.id,
      method: "qr_transfer",
      reference: "SEED-REF-CONFIRMED-001",
      status: "confirmed",
      amountVnd: 43750,
      confirmedAt: ended,
      confirmedByUserId: adminUserId,
    },
  });

  const sessionPending = await prisma.chargingSession.create({
    data: {
      userId,
      stationId: st2.id,
      status: "completed",
      connectorId: 1,
      startedAt: new Date(ended.getTime() - 5400_000),
      endedAt: new Date(ended.getTime() - 1800_000),
      kWh: "8.0",
      amountVnd: 28000,
      paymentStatus: "pending",
    },
  });

  await prisma.payment.create({
    data: {
      sessionId: sessionPending.id,
      method: "qr_transfer",
      reference: "SEED-REF-PENDING-002",
      status: "pending",
      amountVnd: 28000,
    },
  });

  await prisma.chargingSession.create({
    data: {
      userId,
      stationId: st1.id,
      status: "active",
      connectorId: 1,
      paymentStatus: "pending",
    },
  });

  await prisma.ocppEvent.createMany({
    data: [
      {
        stationId: st1.id,
        chargePointId: st1.ocppChargePointId,
        connectorId: 1,
        type: "BootNotification",
        payload: { reason: "PowerUp", status: "Accepted" },
      },
      {
        stationId: st1.id,
        chargePointId: st1.ocppChargePointId,
        connectorId: 1,
        type: "StatusNotification",
        payload: { connectorStatus: "Available" },
      },
      {
        stationId: st2.id,
        chargePointId: st2.ocppChargePointId,
        connectorId: 1,
        type: "BootNotification",
        payload: { reason: "PowerUp", status: "Accepted" },
      },
    ],
  });
}

try {
  await seedUsers();
  console.log("Seeded users (admin, station_owner, user).");

  await seedGlobalPrice();
  console.log("Seeded GlobalPricePolicy id=1.");

  const owner = await prisma.user.findUniqueOrThrow({
    where: { email: stationOwner.email },
    select: { id: true },
  });
  const userRow = await prisma.user.findUniqueOrThrow({
    where: { email: endUser.email },
    select: { id: true },
  });
  const adminRow = await prisma.user.findUniqueOrThrow({
    where: { email: admin.email },
    select: { id: true },
  });

  const existingSeedStations = await prisma.station.findMany({
    where: { slug: { in: SEED_STATION_SLUGS } },
    select: { id: true },
  });
  await clearSeedDerivedRows(existingSeedStations.map((s) => s.id));

  const stations = await seedStations(owner.id);
  console.log(`Seeded ${stations.length} stations (ownerId=${owner.id}) for ${stationOwner.email}.`);

  const backfilled = await backfillStationsWithoutOwner(owner.id);
  if (backfilled > 0) {
    console.log(`Backfill: gán owner ${stationOwner.email} cho ${backfilled} trạm chưa có owner.`);
  }

  await seedSessionsPaymentsAndEvents(stations[0], stations[1], userRow.id, adminRow.id);
  console.log("Seeded charging sessions, payments, OcppEvent samples.");
} finally {
  await prisma.$disconnect();
}

console.log("Seed all done.");
