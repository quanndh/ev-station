import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";

export async function GET(req: Request) {
  const u = await requireApiRole(req, ["station_owner"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [stationsCount, confirmedAgg, sessionsAgg] = await Promise.all([
    prisma.station.count({ where: { ownerId: u.sub } }),
    prisma.chargingSession.aggregate({
      where: { paymentStatus: "confirmed", station: { ownerId: u.sub } },
      _sum: { amountVnd: true },
      _count: { _all: true },
    }),
    prisma.chargingSession.aggregate({
      where: { station: { ownerId: u.sub } },
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    stationsCount,
    totalSessions: sessionsAgg._count._all,
    confirmedSessions: confirmedAgg._count._all,
    totalRevenueVndConfirmed: confirmedAgg._sum.amountVnd ?? 0,
  });
}

