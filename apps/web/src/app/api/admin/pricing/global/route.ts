import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";

export async function POST(req: Request) {
  const u = await requireApiRole(req, ["admin"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { priceVndPerKwh } = body as { priceVndPerKwh?: number };
  if (!Number.isFinite(priceVndPerKwh)) {
    return NextResponse.json({ error: "priceVndPerKwh is required" }, { status: 400 });
  }

  const price = Math.floor(priceVndPerKwh as number);
  const global = await prisma.globalPricePolicy.upsert({
    where: { id: 1 },
    update: { priceVndPerKwh: price },
    create: { id: 1, priceVndPerKwh: price },
    select: { id: true, priceVndPerKwh: true, updatedAt: true },
  });

  return NextResponse.json({ global });
}

export async function GET(req: Request) {
  const u = await requireApiRole(req, ["admin"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const global = await prisma.globalPricePolicy.findUnique({
    where: { id: 1 },
    select: { id: true, priceVndPerKwh: true, updatedAt: true },
  });
  return NextResponse.json({ global });
}

