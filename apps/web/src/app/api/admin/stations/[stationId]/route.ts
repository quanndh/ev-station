import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ stationId: string }> },
) {
  const u = requireApiRole(req, ["admin"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stationId } = await params;
  const body = await req.json().catch(() => ({}));
  const { name, slug, ocppChargePointId, defaultPriceVndPerKwh, ownerId } = body as {
    name?: string;
    slug?: string;
    ocppChargePointId?: string;
    defaultPriceVndPerKwh?: number | null;
    ownerId?: string | null;
  };

  if (!name || !slug || !ocppChargePointId) {
    return NextResponse.json({ error: "name, slug, ocppChargePointId are required" }, { status: 400 });
  }

  let resolvedOwnerId: string | null | undefined = undefined;
  if (ownerId !== undefined) {
    if (ownerId === null || String(ownerId).trim() === "") {
      resolvedOwnerId = null;
    } else {
      const ownerUser = await prisma.user.findUnique({
        where: { id: String(ownerId).trim() },
        select: { id: true, role: true },
      });
      if (!ownerUser || ownerUser.role !== "station_owner") {
        return NextResponse.json({ error: "Invalid owner" }, { status: 400 });
      }
      resolvedOwnerId = ownerUser.id;
    }
  }

  const station = await prisma.station.update({
    where: { id: stationId },
    data: {
      name,
      slug,
      ocppChargePointId,
      defaultPriceVndPerKwh:
        typeof defaultPriceVndPerKwh === "number"
          ? Math.floor(defaultPriceVndPerKwh)
          : null,
      ...(resolvedOwnerId !== undefined ? { ownerId: resolvedOwnerId } : {}),
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

  return NextResponse.json({ station });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ stationId: string }> },
) {
  const u = requireApiRole(req, ["admin"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stationId } = await params;
  await prisma.station.delete({ where: { id: stationId } });

  return NextResponse.json({ ok: true });
}

