import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";
import { endActiveChargingSessionsForStation } from "@/lib/endActiveChargingSessionsForStation";

/** Chủ trạm: tạm dừng / mở lại nhận phiên sạc (không gỡ khóa của admin). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ stationId: string }> },
) {
  const u = await requireApiRole(req, ["station_owner"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stationId } = await params;
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    select: { id: true, ownerId: true, disabledAt: true, disabledBy: true },
  });
  if (!station || station.ownerId !== u.sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { disabled } = body as { disabled?: boolean };
  if (typeof disabled !== "boolean") {
    return NextResponse.json({ error: "disabled boolean required" }, { status: 400 });
  }

  if (disabled) {
    if (station.disabledBy === "admin") {
      return NextResponse.json(
        {
          error:
            "Trạm đang bị quản trị viên tạm dừng. Bạn không thể thay đổi trạng thái này.",
        },
        { status: 403 },
      );
    }
    await endActiveChargingSessionsForStation(stationId);
    await prisma.station.update({
      where: { id: stationId },
      data: { disabledAt: new Date(), disabledBy: "owner" },
    });
  } else {
    if (station.disabledBy !== "owner") {
      return NextResponse.json(
        {
          error:
            "Chỉ mở lại được khi chính bạn đã tạm dừng trạm. Trạm bị admin khóa cần admin mở lại.",
        },
        { status: 403 },
      );
    }
    await prisma.station.update({
      where: { id: stationId },
      data: { disabledAt: null, disabledBy: null },
    });
  }

  return NextResponse.json({ ok: true });
}
