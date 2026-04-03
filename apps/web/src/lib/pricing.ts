import { prisma } from "@ev/db";

export async function getEffectivePriceVndPerKwh(stationId: string) {
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    select: { defaultPriceVndPerKwh: true },
  });

  if (station?.defaultPriceVndPerKwh != null) return station.defaultPriceVndPerKwh;

  const global = await prisma.globalPricePolicy.findUnique({
    where: { id: 1 },
    select: { priceVndPerKwh: true },
  });

  return global?.priceVndPerKwh ?? 0;
}

export function computeAmountVndFromKwh(kWh: number, priceVndPerKwh: number) {
  if (!Number.isFinite(kWh) || !Number.isFinite(priceVndPerKwh)) return 0;
  if (kWh <= 0) return 0;
  return Math.max(0, Math.floor(kWh * priceVndPerKwh));
}

