import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";
import { listMeta, listTake, parseListPagination, sliceListPage } from "@/lib/apiPagination";
import { resolveListDateRangeFromUrl } from "@/lib/vnDateRange";

/** Toàn bộ phiên sạc (mọi trạm), chỉ admin — dùng trang lịch sử tổng hợp. */
export async function GET(req: Request) {
  const u = await requireApiRole(req, ["admin"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const { fromYmd, toYmd, gte, lte } = resolveListDateRangeFromUrl(url);
  const where = { startedAt: { gte, lte } };

  const { limit, offset } = parseListPagination(req);
  const [rows, agg] = await Promise.all([
    prisma.chargingSession.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: offset,
      take: listTake(limit),
      select: {
      id: true,
      stationId: true,
      status: true,
      startedAt: true,
      endedAt: true,
      kWh: true,
      amountVnd: true,
      paymentStatus: true,
      user: { select: { email: true, name: true } },
      station: { select: { id: true, name: true, slug: true } },
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
    stationId: s.stationId,
    station: s.station,
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
