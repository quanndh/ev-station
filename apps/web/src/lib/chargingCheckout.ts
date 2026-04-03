import { prisma } from "@ev/db";

import { computeAmountVndFromKwh, getEffectivePriceVndPerKwh } from "@/lib/pricing";

export type ChargingCheckoutJson = {
  session: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    kWh: number | null;
    amountVnd: number | null;
    paymentStatus: string;
  };
  payment: {
    reference: string;
    method: string;
    status: string;
    amountVnd: number;
  } | null;
};

export async function buildChargingCheckout(sessionId: string): Promise<ChargingCheckoutJson | null> {
  const s = await prisma.chargingSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      startedAt: true,
      endedAt: true,
      kWh: true,
      amountVnd: true,
      paymentStatus: true,
      payment: { select: { reference: true, method: true, status: true, amountVnd: true } },
    },
  });
  if (!s) return null;
  return {
    session: {
      id: s.id,
      status: s.status,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString() ?? null,
      kWh: s.kWh ? s.kWh.toNumber() : null,
      amountVnd: s.amountVnd ?? null,
      paymentStatus: s.paymentStatus,
    },
    payment: s.payment
      ? {
          reference: s.payment.reference,
          method: s.payment.method,
          status: s.payment.status,
          amountVnd: s.payment.amountVnd,
        }
      : null,
  };
}

/** Hoàn tất phiên trên DB (không qua OCPP) — cập nhật tiền theo kWh hiện có. */
export async function finalizeChargingSessionLocal(sessionId: string) {
  const session = await prisma.chargingSession.findUnique({
    where: { id: sessionId },
    select: { stationId: true, kWh: true, startedAt: true },
  });
  if (!session) return { ok: false as const, error: "not_found" as const };

  const priceVndPerKwh = await getEffectivePriceVndPerKwh(session.stationId);
  let kWhNum = session.kWh ? session.kWh.toNumber() : 0;
  // Không có OCPP/MeterValues: ước lượng theo thời gian (công suất giả định ~3,7 kW).
  if (kWhNum <= 0) {
    const hours = Math.max(0, (Date.now() - session.startedAt.getTime()) / 3_600_000);
    kWhNum = Math.round(Math.min(80, hours * 3.7) * 1000) / 1000;
  }
  const amountVnd = computeAmountVndFromKwh(kWhNum, priceVndPerKwh);

  await prisma.$transaction([
    prisma.chargingSession.update({
      where: { id: sessionId },
      data: {
        status: "completed",
        endedAt: new Date(),
        kWh: kWhNum,
        amountVnd,
        paymentStatus: "pending",
      },
    }),
    prisma.payment.updateMany({
      where: { sessionId },
      data: { amountVnd },
    }),
  ]);

  return { ok: true as const };
}
