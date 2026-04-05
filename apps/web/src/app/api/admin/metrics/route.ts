import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";

export async function GET(req: Request) {
  const u = await requireApiRole(req, ["admin"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [confirmedAgg, sessionsAgg, stationsCount] = await Promise.all([
    prisma.chargingSession.aggregate({
      where: { paymentStatus: "confirmed" },
      _sum: { amountVnd: true },
      _count: { _all: true },
    }),
    prisma.chargingSession.aggregate({
      _count: { _all: true },
    }),
    prisma.station.count(),
  ]);

  return NextResponse.json({
    stationsCount,
    totalSessions: sessionsAgg._count._all,
    confirmedSessions: confirmedAgg._count._all,
    totalRevenueVndConfirmed: confirmedAgg._sum.amountVnd ?? 0,
  });
}

