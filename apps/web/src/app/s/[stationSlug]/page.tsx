import { notFound } from "next/navigation";

import { verifyStationToken } from "@/lib/qrToken";
import { bypassStationSignedQrToken } from "@/lib/chargingSkipOcpp";
import { chargingBlockReasonForStation, isStationChargingBlocked } from "@/lib/chargingEligibility";
import { getEffectivePriceVndPerKwh } from "@/lib/pricing";
import { prisma } from "@ev/db";
import ChargingPanel from "./_components/ChargingPanel";
import StationQrGate from "./_components/StationQrGate";
import type { StationGateReason } from "./_components/StationQrGate";

export default async function StationDeepLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ stationSlug: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { stationSlug } = await params;
  const { t: token } = await searchParams;

  const slug = stationSlug?.trim();
  if (!slug) notFound();

  const station = await prisma.station.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      lastSeenAt: true,
      disabledAt: true,
      disabledBy: true,
      owner: { select: { disabledAt: true } },
    },
  });
  if (!station) notFound();

  const chargingBlocked = isStationChargingBlocked(station);
  const chargingBlockReason = chargingBlockReasonForStation(station);

  const initialPriceVndPerKwh = await getEffectivePriceVndPerKwh(station.id);
  let authorized = false;
  let gateReason: StationGateReason = "missing_token";

  if (bypassStationSignedQrToken()) {
    authorized = true;
  } else if (token) {
    const verified = verifyStationToken(token);
    if (!verified) {
      gateReason = "invalid_token";
    } else if (verified.stationId !== station.id) {
      gateReason = "wrong_station";
    } else {
      authorized = true;
    }
  }

  if (!authorized) {
    return <StationQrGate station={{ name: station.name, slug: station.slug }} reason={gateReason} />;
  }

  const activeSession = await prisma.chargingSession.findFirst({
    where: { stationId: station.id, status: "active" },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      startedAt: true,
      kWh: true,
      amountVnd: true,
      paymentStatus: true,
      userId: true,
      payment: { select: { reference: true, method: true } },
    },
  });

  return (
    <ChargingPanel
      station={{ id: station.id, name: station.name, slug: station.slug }}
      initialChargingBlocked={chargingBlocked}
      initialChargingBlockReason={chargingBlockReason}
      initialPriceVndPerKwh={initialPriceVndPerKwh}
      lastSeenAt={station.lastSeenAt?.toISOString() ?? null}
      initialActiveSession={
        activeSession
          ? {
              id: activeSession.id,
              startedAt: activeSession.startedAt.toISOString(),
              kWh: activeSession.kWh ? activeSession.kWh.toNumber() : null,
              amountVnd: activeSession.amountVnd ?? null,
              paymentStatus: activeSession.paymentStatus,
              userId: activeSession.userId,
              paymentReference: activeSession.payment?.reference ?? null,
              paymentMethod: activeSession.payment?.method ?? null,
            }
          : null
      }
    />
  );
}
