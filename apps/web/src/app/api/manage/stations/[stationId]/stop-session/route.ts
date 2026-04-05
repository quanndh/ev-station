import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";
import { buildChargingCheckout, finalizeChargingSessionLocal } from "@/lib/chargingCheckout";
import { chargingSkipOcpp } from "@/lib/chargingSkipOcpp";
import { remoteStop } from "@/lib/ocppClient";
import { canStopChargingOnStation, canViewStationSessions } from "@/lib/stationManageAuth";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: Request, ctx: { params: Promise<{ stationId: string }> }) {
  const u = await requireApiRole(req, ["admin", "station_owner"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stationId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const sessionIdFilter =
    typeof body.sessionId === "string" && body.sessionId.trim() ? body.sessionId.trim() : undefined;

  const station = await prisma.station.findUnique({
    where: { id: stationId },
    select: { id: true, ownerId: true },
  });
  if (!station || !canViewStationSessions(u, station)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canStopChargingOnStation(u, station)) {
    return NextResponse.json(
      {
        error:
          u.role === "admin"
            ? "Admin chỉ dừng phiên được trên trạm chưa gán chủ. Trạm có chủ trạm: chỉ chủ trạm được dừng."
            : "Bạn không có quyền dừng phiên tại trạm này.",
      },
      { status: 403 },
    );
  }

  const session = await prisma.chargingSession.findFirst({
    where: {
      stationId,
      status: "active",
      ...(sessionIdFilter ? { id: sessionIdFilter } : {}),
    },
    orderBy: { startedAt: "desc" },
    select: { id: true, stationId: true, status: true },
  });

  if (!session) {
    return NextResponse.json({ error: "Không có phiên sạc đang hoạt động" }, { status: 404 });
  }

  if (chargingSkipOcpp()) {
    const fin = await finalizeChargingSessionLocal(session.id);
    if (!fin.ok) {
      return NextResponse.json({ error: "Could not finalize session" }, { status: 500 });
    }
    const checkout = await buildChargingCheckout(session.id);
    return NextResponse.json({
      checkout,
      message:
        "Đã kết thúc phiên sạc. Khách cần thanh toán theo hướng dẫn (nếu có).",
    });
  }

  try {
    await remoteStop({ sessionId: session.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to request stop charging";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  for (let i = 0; i < 15; i++) {
    await sleep(400);
    const s = await prisma.chargingSession.findUnique({
      where: { id: session.id },
      select: { status: true },
    });
    if (s?.status === "completed") {
      const checkout = await buildChargingCheckout(session.id);
      return NextResponse.json({
        checkout,
        message: "Đã kết thúc phiên sạc. Khách thanh toán theo hướng dẫn.",
      });
    }
  }

  return NextResponse.json({
    awaitingCompletion: true,
    sessionId: session.id,
    message: "Đã gửi lệnh dừng tới trạm. Đang chờ trạm xác nhận…",
  });
}
