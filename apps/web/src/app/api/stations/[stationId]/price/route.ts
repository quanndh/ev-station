import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { assertStationOwner } from "@/lib/authz";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ stationId: string }> },
) {
  const { stationId } = await params;
  await assertStationOwner(stationId);

  const body = await req.json().catch(() => ({}));
  const { defaultPriceVndPerKwh } = body as { defaultPriceVndPerKwh?: number | null };

  if (defaultPriceVndPerKwh != null && !Number.isFinite(defaultPriceVndPerKwh)) {
    return NextResponse.json({ error: "Invalid defaultPriceVndPerKwh" }, { status: 400 });
  }

  const station = await prisma.station.update({
    where: { id: stationId },
    data: {
      defaultPriceVndPerKwh:
        defaultPriceVndPerKwh == null ? null : Math.floor(defaultPriceVndPerKwh),
    },
    select: { id: true, defaultPriceVndPerKwh: true },
  });

  return NextResponse.json({ station });
}

