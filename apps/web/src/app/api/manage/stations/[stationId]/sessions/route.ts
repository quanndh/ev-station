import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";
import { listMeta, listTake, parseListPagination, sliceListPage } from "@/lib/apiPagination";
import { canViewStationSessions } from "@/lib/stationManageAuth";
import { resolveListDateRangeFromUrl } from "@/lib/vnDateRange";

export async function GET(req: Request, ctx: { params: Promise<{ stationId: string }> }) {
  const u = await requireApiRole(req, ["admin", "station_owner"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stationId } = await ctx.params;
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    select: { id: true, name: true, slug: true, ownerId: true },
  });
  if (!station || !canViewStationSessions(u, station)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const { fromYmd, toYmd, gte, lte } = resolveListDateRangeFromUrl(url);
  const where = { stationId, startedAt: { gte, lte } };

  const { limit, offset } = parseListPagination(req);
  const [rows, agg] = await Promise.all([
    prisma.chargingSession.findMany({
      where,
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
    }),
    prisma.chargingSession.aggregate({
      where,
      _count: { _all: true },
      _sum: { kWh: true, amountVnd: true },
    }),
  ]);
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
    station: { id: station.id, name: station.name, slug: station.slug },
    dateRange: { from: fromYmd, to: toYmd },
    stats: {
      totalSessions: agg._count._all,
      totalKwh: agg._sum.kWh != null ? agg._sum.kWh.toString() : null,
      totalAmountVnd: agg._sum.amountVnd ?? 0,
    },
    sessions,
    ...listMeta(offset, sessions.length, hasMore),
  });
}
