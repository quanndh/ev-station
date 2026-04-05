import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";
import { qrStationTokenExpMs, signStationToken } from "@/lib/qrToken";
import { listMeta, listTake, parseListPagination, sliceListPage } from "@/lib/apiPagination";

export async function POST(req: Request) {
  const user = await requireApiRole(req, ["admin"]);
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
  const user = await requireApiRole(req, ["admin"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const ownerIdParam = searchParams.get("ownerId");
  const nameQ = searchParams.get("q")?.trim() ?? "";
  const statusFilter = searchParams.get("status");

  const andParts: object[] = [];

  if (nameQ.length > 0) {
    andParts.push({
      OR: [
        { name: { contains: nameQ, mode: "insensitive" as const } },
        { slug: { contains: nameQ, mode: "insensitive" as const } },
      ],
    });
  }

  if (ownerIdParam === "_none") {
    andParts.push({ ownerId: null });
  } else if (ownerIdParam && ownerIdParam.trim().length > 0) {
    andParts.push({ ownerId: ownerIdParam.trim() });
  }

  if (statusFilter === "open") {
    andParts.push({
      disabledAt: null,
      OR: [{ ownerId: null }, { owner: { disabledAt: null } }],
    });
  } else if (statusFilter === "blocked") {
    andParts.push({
      OR: [
        { disabledAt: { not: null } },
        { owner: { is: { disabledAt: { not: null } } } },
      ],
    });
  }

  const whereClause = andParts.length ? { AND: andParts } : {};

  const { limit, offset } = parseListPagination(req);
  const rows = await prisma.station.findMany({
    where: whereClause,
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
      disabledAt: true,
      disabledBy: true,
      owner: { select: { id: true, email: true, name: true, disabledAt: true } },
    },
  });
  const { items, hasMore } = sliceListPage(rows, limit);
  const stations = items.map((s) => ({
    ...s,
    lastSeenAt: s.lastSeenAt?.toISOString() ?? null,
    disabledAt: s.disabledAt?.toISOString() ?? null,
    owner: s.owner
      ? {
          ...s.owner,
          disabledAt: s.owner.disabledAt?.toISOString() ?? null,
        }
      : null,
  }));
  return NextResponse.json({ stations, ...listMeta(offset, stations.length, hasMore) });
}

