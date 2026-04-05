import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";
import { listMeta, listTake, parseListPagination, sliceListPage } from "@/lib/apiPagination";
import { isStationChargingBlocked } from "@/lib/chargingEligibility";

/** Danh sách trạm: admin thấy tất cả, chủ trạm chỉ trạm của mình (lịch sử sạc / vận hành). */
export async function GET(req: Request) {
  const u = await requireApiRole(req, ["admin", "station_owner"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { limit, offset } = parseListPagination(req);
  const rows = await prisma.station.findMany({
    where: u.role === "admin" ? {} : { ownerId: u.sub },
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
      ownerId: true,
      disabledAt: true,
      disabledBy: true,
      owner: { select: { id: true, email: true, name: true, disabledAt: true } },
    },
  });
  const { items, hasMore } = sliceListPage(rows, limit);
  const stations = items.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    ocppChargePointId: s.ocppChargePointId,
    defaultPriceVndPerKwh: s.defaultPriceVndPerKwh,
    lastSeenAt: s.lastSeenAt?.toISOString() ?? null,
    ownerId: s.ownerId,
    disabledAt: s.disabledAt?.toISOString() ?? null,
    disabledBy: s.disabledBy,
    chargingBlocked: isStationChargingBlocked(s),
    owner: s.owner
      ? {
          ...s.owner,
          disabledAt: s.owner.disabledAt?.toISOString() ?? null,
        }
      : null,
  }));
  return NextResponse.json({ stations, ...listMeta(offset, stations.length, hasMore) });
}
