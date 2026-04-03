import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";
import { qrStationTokenExpMs, signStationToken } from "@/lib/qrToken";
import { listMeta, listTake, parseListPagination, sliceListPage } from "@/lib/apiPagination";

export async function POST(req: Request) {
  const user = requireApiRole(req, ["admin"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, slug, ocppChargePointId, defaultPriceVndPerKwh, ownerId } = body as {
    name?: string;
    slug?: string;
    ocppChargePointId?: string;
    defaultPriceVndPerKwh?: number | null;
    ownerId?: string | null;
  };

  if (!name || !slug || !ocppChargePointId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  let resolvedOwnerId: string | null = null;
  if (ownerId != null && String(ownerId).trim() !== "") {
    const ownerUser = await prisma.user.findUnique({
      where: { id: String(ownerId).trim() },
      select: { id: true, role: true },
    });
    if (!ownerUser || ownerUser.role !== "station_owner") {
      return NextResponse.json({ error: "Invalid owner" }, { status: 400 });
    }
    resolvedOwnerId = ownerUser.id;
  }

  const station = await prisma.station.create({
    data: {
      ownerId: resolvedOwnerId,
      name,
      slug,
      ocppChargePointId,
      defaultPriceVndPerKwh:
        typeof defaultPriceVndPerKwh === "number" ? defaultPriceVndPerKwh : null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      ocppChargePointId: true,
      defaultPriceVndPerKwh: true,
      ownerId: true,
      owner: { select: { id: true, email: true, name: true } },
    },
  });

  const expMs = qrStationTokenExpMs();
  const token = signStationToken(station.id, expMs);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const qrUrl = baseUrl ? `${baseUrl}/s/${station.slug}?t=${encodeURIComponent(token)}` : `/s/${station.slug}?t=${encodeURIComponent(token)}`;

  return NextResponse.json({ station, qrUrl });
}

export async function GET(req: Request) {
  const user = requireApiRole(req, ["admin"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { limit, offset } = parseListPagination(req);
  const rows = await prisma.station.findMany({
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: listTake(limit),
    select: {
      id: true,
      name: true,
      slug: true,
      ocppChargePointId: true,
      ocppConnectorId: true,
      defaultPriceVndPerKwh: true,
      lastSeenAt: true,
      ownerId: true,
      owner: { select: { id: true, email: true, name: true } },
    },
  });
  const { items, hasMore } = sliceListPage(rows, limit);
  return NextResponse.json({ stations: items, ...listMeta(offset, items.length, hasMore) });
}

