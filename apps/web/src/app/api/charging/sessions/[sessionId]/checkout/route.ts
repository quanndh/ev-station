import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { buildChargingCheckout } from "@/lib/chargingCheckout";

function keysMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const key = new URL(req.url).searchParams.get("key")?.trim() ?? "";
  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  const row = await prisma.chargingSession.findUnique({
    where: { id: sessionId },
    select: { stopKey: true },
  });
  if (!row?.stopKey || !keysMatch(row.stopKey, key)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const checkout = await buildChargingCheckout(sessionId);
  if (!checkout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(checkout);
}
