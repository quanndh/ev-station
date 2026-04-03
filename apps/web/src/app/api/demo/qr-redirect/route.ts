import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { DEFAULT_DEMO_STATION_ID } from "@/lib/demoDefaults";

export const dynamic = "force-dynamic";

function demoEnabled() {
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.DEMO_MODE === "true"
  );
}

export async function GET() {
  if (!demoEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stationId = (process.env.DEMO_STATION_ID ?? DEFAULT_DEMO_STATION_ID).trim();
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    select: { slug: true },
  });

  if (!station) {
    return NextResponse.json({ error: "Station not found" }, { status: 404 });
  }

  const path = `/s/${encodeURIComponent(station.slug)}`;
  return NextResponse.json({ path });
}
