import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";
import { listMeta, listTake, parseListPagination, sliceListPage } from "@/lib/apiPagination";

export async function GET(req: Request) {
  const u = requireApiRole(req, ["station_owner"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { limit, offset } = parseListPagination(req);
  const rows = await prisma.station.findMany({
    where: { ownerId: u.sub },
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: listTake(limit),
    select: {
      id: true,
      name: true,
      slug: true,
      ocppChargePointId: true,
      defaultPriceVndPerKwh: true,
      lastSeenAt: true,
    },
  });
  const { items, hasMore } = sliceListPage(rows, limit);
  return NextResponse.json({ stations: items, ...listMeta(offset, items.length, hasMore) });
}

