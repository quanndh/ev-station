import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";
import { listMeta, listTake, parseListPagination, sliceListPage } from "@/lib/apiPagination";
import { resolveListDateRangeFromUrl } from "@/lib/vnDateRange";

export async function GET(req: Request) {
  const u = await requireApiRole(req, ["station_owner"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const { fromYmd, toYmd, gte, lte } = resolveListDateRangeFromUrl(url);
  const baseWhere = { chargingSession: { station: { ownerId: u.sub } } };
  const where = {
    ...baseWhere,
    createdAt: { gte, lte },
  };

  const { limit, offset } = parseListPagination(req);
  const [rows, agg] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: listTake(limit),
      select: {
      id: true,
      sessionId: true,
      reference: true,
      status: true,
      amountVnd: true,
      method: true,
      createdAt: true,
      confirmedAt: true,
      chargingSession: {
        select: {
          startedAt: true,
          kWh: true,
          user: { select: { email: true, name: true } },
          station: { select: { id: true, name: true, slug: true } },
        },
      },
    },
    }),
    prisma.payment.aggregate({
      where,
      _count: { _all: true },
      _sum: { amountVnd: true },
    }),
  ]);
  const { items, hasMore } = sliceListPage(rows, limit);

  const payments = items.map((p) => ({
    paymentId: p.id,
    sessionId: p.sessionId,
    reference: p.reference,
    status: p.status,
    amountVnd: p.amountVnd,
    method: p.method,
    createdAt: p.createdAt.toISOString(),
    confirmedAt: p.confirmedAt ? p.confirmedAt.toISOString() : null,
    station: p.chargingSession.station,
    sessionStartedAt: p.chargingSession.startedAt.toISOString(),
    kWh: p.chargingSession.kWh != null ? String(p.chargingSession.kWh) : null,
    userEmail: p.chargingSession.user.email,
    userName: p.chargingSession.user.name,
    canConfirm: p.status === "pending",
  }));

  return NextResponse.json({
    dateRange: { from: fromYmd, to: toYmd },
    stats: {
      paymentCount: agg._count._all,
      totalAmountVnd: agg._sum.amountVnd ?? 0,
    },
    payments,
    ...listMeta(offset, payments.length, hasMore),
  });
}
