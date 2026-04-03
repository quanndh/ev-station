import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const user = requireApiRole(req, ["admin", "station_owner"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;

  const session = await prisma.chargingSession.findUnique({
    where: { id: sessionId },
    select: { stationId: true, station: { select: { ownerId: true } } },
  });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  if (user.role === "admin") {
    if (session.station.ownerId != null) {
      return NextResponse.json(
        { error: "Admin chỉ xác nhận thanh toán cho trạm chưa gán chủ." },
        { status: 403 },
      );
    }
  }

  if (user.role === "station_owner") {
    if (!session.station.ownerId || session.station.ownerId !== user.sub) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await prisma.payment.update({
    where: { sessionId },
    data: {
      status: "confirmed",
      confirmedAt: new Date(),
      confirmedByUserId: user.sub,
    },
  });

  await prisma.chargingSession.update({
    where: { id: sessionId },
    data: { paymentStatus: "confirmed" },
  });

  return NextResponse.json({ ok: true });
}

