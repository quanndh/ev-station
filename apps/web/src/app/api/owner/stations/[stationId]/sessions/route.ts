import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";
import { listMeta, listTake, parseListPagination, sliceListPage } from "@/lib/apiPagination";

export async function GET(req: Request, ctx: { params: Promise<{ stationId: string }> }) {
  const u = requireApiRole(req, ["station_owner"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stationId } = await ctx.params;
  const station = await prisma.station.findFirst({
    where: { id: stationId, ownerId: u.sub },
    select: { id: true, name: true, slug: true },
  });
  if (!station) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { limit, offset } = parseListPagination(req);
  const rows = await prisma.chargingSession.findMany({
    where: { stationId },
    orderBy: { startedAt: "desc" },
    skip: offset,
    take: listTake(limit),
    select: {
      id: true,
      status: true,
      startedAt: true,
      endedAt: true,
      kWh: true,
      amountVnd: true,
      paymentStatus: true,
      user: { select: { email: true, name: true } },
    },
  });
  const { items: pageRows, hasMore } = sliceListPage(rows, limit);

  const sessions = pageRows.map((s) => ({
    id: s.id,
    status: s.status,
    startedAt: s.startedAt.toISOString(),
    endedAt: s.endedAt ? s.endedAt.toISOString() : null,
    kWh: s.kWh != null ? String(s.kWh) : null,
    amountVnd: s.amountVnd,
    paymentStatus: s.paymentStatus,
    userEmail: s.user.email,
    userName: s.user.name,
  }));

  return NextResponse.json({
    station,
    sessions,
    ...listMeta(offset, sessions.length, hasMore),
  });
}
