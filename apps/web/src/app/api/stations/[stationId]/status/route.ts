import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { getEffectivePriceVndPerKwh } from "@/lib/pricing";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ stationId: string }> },
) {
  const { stationId } = await params;

  const station = await prisma.station.findUnique({
    where: { id: stationId },
    select: { id: true, slug: true, name: true, lastSeenAt: true },
  });
  if (!station) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
      },
    }),
    getEffectivePriceVndPerKwh(stationId),
  ]);

  const status = activeSession ? "charging" : "available";

  return NextResponse.json({
    station: {
      id: station.id,
      slug: station.slug,
      name: station.name,
      lastSeenAt: station.lastSeenAt?.toISOString() ?? null,
    },
    priceVndPerKwh,
    status,
    activeSession: activeSession
      ? {
          id: activeSession.id,
          userId: activeSession.userId,
          startedAt: activeSession.startedAt,
          kWh: activeSession.kWh ? activeSession.kWh.toNumber() : null,
          amountVnd: activeSession.amountVnd ?? null,
          paymentStatus: activeSession.paymentStatus,
          paymentReference: activeSession.payment?.reference ?? null,
          paymentMethod: activeSession.payment?.method ?? null,
        }
      : null,
  });
}

