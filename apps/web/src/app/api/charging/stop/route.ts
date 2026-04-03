import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { resolveChargingActorUserId } from "@/lib/authz";
import { buildChargingCheckout, finalizeChargingSessionLocal } from "@/lib/chargingCheckout";
import { chargingSkipOcpp } from "@/lib/chargingSkipOcpp";
import { remoteStop } from "@/lib/ocppClient";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function keysMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { sessionId, stopKey, deviceId } = body as {
    sessionId?: string;
    stopKey?: string;
    deviceId?: string;
  };

  if (!sessionId?.trim()) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }
  const sk = stopKey?.trim() ?? "";
  if (!sk) {
    return NextResponse.json({ error: "stopKey is required" }, { status: 400 });
  }

  const actor = await resolveChargingActorUserId(req, deviceId);
  if ("error" in actor) {
    return NextResponse.json({ error: actor.error }, { status: actor.status });
  }

  const session = await prisma.chargingSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      stationId: true,
      status: true,
      kWh: true,
      amountVnd: true,
      stopKey: true,
    },
  });

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.userId !== actor.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session.stopKey || !keysMatch(session.stopKey, sk)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.status !== "active") {
    return NextResponse.json({ error: "Session is not active" }, { status: 409 });
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
        "Đã kết thúc phiên sạc. Vui lòng chuyển khoản theo nội dung bên dưới và chờ chủ trạm xác nhận.",
    });
  }

  try {
    await remoteStop({ sessionId: session.id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to request stop charging" },
      { status: 503 },
    );
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
        message:
          "Đã kết thúc phiên sạc. Vui lòng thanh toán theo hướng dẫn (QR / nội dung chuyển khoản).",
      });
    }
  }

  return NextResponse.json({
    awaitingCompletion: true,
    sessionId: session.id,
    message: "Đã gửi lệnh dừng tới trạm. Đang chờ trạm xác nhận…",
  });
}
