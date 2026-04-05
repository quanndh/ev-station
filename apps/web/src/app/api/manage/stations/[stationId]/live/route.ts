import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";
import { chargingBlockReasonForStation, isStationChargingBlocked } from "@/lib/chargingEligibility";
import { getEffectivePriceVndPerKwh } from "@/lib/pricing";
import { canStopChargingOnStation, canViewStationSessions } from "@/lib/stationManageAuth";

export async function GET(_req: Request, ctx: { params: Promise<{ stationId: string }> }) {
  const u = await requireApiRole(_req, ["admin", "station_owner"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stationId } = await ctx.params;

  const station = await prisma.station.findUnique({
    where: { id: stationId },
    select: {
      id: true,
      slug: true,
      name: true,
      lastSeenAt: true,
      ownerId: true,
      disabledAt: true,
      disabledBy: true,
      owner: { select: { disabledAt: true } },
    },
  });
  if (!station || !canViewStationSessions(u, station)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canStopSession = canStopChargingOnStation(u, station);

  const [activeSession, priceVndPerKwh] = await Promise.all([
    prisma.chargingSession.findFirst({
      where: { stationId, status: "active" },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        userId: true,
        startedAt: true,
        kWh: true,
        amountVnd: true,
        paymentStatus: true,
        payment: { select: { reference: true, method: true } },
        user: { select: { email: true, name: true } },
      },
    }),
    getEffectivePriceVndPerKwh(stationId),
  ]);

  const status = activeSession ? "charging" : "available";
  const chargingBlocked = isStationChargingBlocked(station);
  const chargingBlockReason = chargingBlockReasonForStation(station);

  return NextResponse.json({
    station: {
      id: station.id,
      slug: station.slug,
      name: station.name,
      lastSeenAt: station.lastSeenAt?.toISOString() ?? null,
      ownerId: station.ownerId,
      disabledAt: station.disabledAt?.toISOString() ?? null,
      disabledBy: station.disabledBy,
      chargingBlocked,
      chargingBlockReason,
    },
    priceVndPerKwh,
    status,
    canStopSession,
    activeSession: activeSession
      ? {
          id: activeSession.id,
          userId: activeSession.userId,
          startedAt: activeSession.startedAt.toISOString(),
          kWh: activeSession.kWh ? activeSession.kWh.toNumber() : null,
          amountVnd: activeSession.amountVnd ?? null,
          paymentStatus: activeSession.paymentStatus,
          paymentReference: activeSession.payment?.reference ?? null,
          paymentMethod: activeSession.payment?.method ?? null,
          userEmail: activeSession.user.email,
          userName: activeSession.user.name,
        }
      : null,
  });
}
