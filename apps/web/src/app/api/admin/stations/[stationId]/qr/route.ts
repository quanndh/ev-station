import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";
import { qrStationTokenExpMs, signStationToken } from "@/lib/qrToken";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ stationId: string }> },
) {
  const u = requireApiRole(req, ["admin"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { stationId } = await params;

  const station = await prisma.station.findUnique({
    where: { id: stationId },
    select: { id: true, slug: true },
  });
  if (!station) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const expMs = qrStationTokenExpMs();
  const token = signStationToken(station.id, expMs);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const qrUrl = baseUrl
    ? `${baseUrl}/s/${station.slug}?t=${encodeURIComponent(token)}`
    : `/s/${station.slug}?t=${encodeURIComponent(token)}`;

  return NextResponse.json({ stationId: station.id, qrUrl, expMs });
}

