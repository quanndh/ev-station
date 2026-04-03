import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";
import { listMeta, listTake, parseListPagination, sliceListPage } from "@/lib/apiPagination";

export async function GET(req: Request) {
  const u = requireApiRole(req, ["admin"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { limit, offset } = parseListPagination(req);
  const rows = await prisma.payment.findMany({
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
          station: { select: { id: true, name: true, slug: true, ownerId: true } },
        },
      },
    },
  });
  const { items, hasMore } = sliceListPage(rows, limit);

  const payments = items.map((p) => {
    const st = p.chargingSession.station;
    const canConfirm = p.status === "pending" && st.ownerId == null;
    return {
      paymentId: p.id,
      sessionId: p.sessionId,
      reference: p.reference,
      status: p.status,
      amountVnd: p.amountVnd,
      method: p.method,
      createdAt: p.createdAt.toISOString(),
      confirmedAt: p.confirmedAt ? p.confirmedAt.toISOString() : null,
      station: { id: st.id, name: st.name, slug: st.slug },
      sessionStartedAt: p.chargingSession.startedAt.toISOString(),
      kWh: p.chargingSession.kWh != null ? String(p.chargingSession.kWh) : null,
      userEmail: p.chargingSession.user.email,
      userName: p.chargingSession.user.name,
      canConfirm,
    };
  });

  return NextResponse.json({ payments, ...listMeta(offset, payments.length, hasMore) });
}
