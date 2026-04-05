import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import {
  chargingBlockReasonForStation,
  isStationChargingBlocked,
  MSG_CONTACT_SUPPORT_CHARGING,
} from "@/lib/chargingEligibility";
import { resolveChargingActorUserId } from "@/lib/authz";
import { chargingSkipOcpp } from "@/lib/chargingSkipOcpp";
import {
  computeAmountVndFromKwh,
  getEffectivePriceVndPerKwh,
} from "@/lib/pricing";
import { remoteStart } from "@/lib/ocppClient";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { stationId, deviceId } = body as { stationId?: string; deviceId?: string };

  const actor = await resolveChargingActorUserId(req, deviceId);
  if ("error" in actor) {
    return NextResponse.json({ error: actor.error }, { status: actor.status });
  }
  const { userId } = actor;

  const actorUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { disabledAt: true },
  });
  if (actorUser?.disabledAt) {
    return NextResponse.json(
      {
        error: MSG_CONTACT_SUPPORT_CHARGING,
        errorCode: "user_charging_disabled",
      },
      { status: 403 },
    );
  }

  if (!stationId) {
    return NextResponse.json(
      { error: "stationId is required" },
      { status: 400 },
    );
  }

  const station = await prisma.station.findUnique({
    where: { id: stationId },
    select: {
      id: true,
      disabledAt: true,
      disabledBy: true,
      owner: { select: { disabledAt: true } },
    },
  });
  if (!station)
    return NextResponse.json({ error: "Station not found" }, { status: 404 });

  if (isStationChargingBlocked(station)) {
    const reason = chargingBlockReasonForStation(station);
    return NextResponse.json(
      {
        error: MSG_CONTACT_SUPPORT_CHARGING,
        errorCode:
          reason === "owner_account_disabled"
            ? "owner_account_station_blocked"
            : "station_charging_disabled",
      },
      { status: 403 },
    );
  }

  const existingActive = await prisma.chargingSession.findFirst({
    where: { stationId, status: "active" },
    select: { id: true },
  });

  if (existingActive) {
    return NextResponse.json({ error: "Station is charging" }, { status: 409 });
  }

  const priceVndPerKwh = await getEffectivePriceVndPerKwh(stationId);
  const stopKey = crypto.randomBytes(32).toString("hex");

  const session = await prisma.chargingSession.create({
    data: {
      userId,
      stationId,
      status: "active",
      connectorId: 1,
      kWh: null,
      amountVnd: 0,
      paymentStatus: "pending",
      stopKey,
    },
    select: {
      id: true,
      startedAt: true,
      stationId: true,
      connectorId: true,
    },
  });

  const reference = `EVGS_${crypto.randomBytes(10).toString("hex")}`;
  const payment = await prisma.payment.create({
    data: {
      sessionId: session.id,
      method: "qr_transfer",
      reference,
      status: "pending",
      amountVnd: 0,
    },
  });

  if (!chargingSkipOcpp()) {
    try {
      await remoteStart({ sessionId: session.id, stationId });
    } catch (err: any) {
      await prisma.chargingSession
        .update({
          where: { id: session.id },
          data: {
            status: "cancelled",
            endedAt: new Date(),
            paymentStatus: "cancelled",
          },
        })
        .catch(() => undefined);
      await prisma.payment
        .update({
          where: { id: payment.id },
          data: { status: "cancelled" },
        })
        .catch(() => undefined);
      const msg = err?.message ?? "Failed to start charging on charger";
      return NextResponse.json(
        {
          error: msg,
          hint: "OCPP/RemoteStart thất bại. Dev: bật `CHARGING_SKIP_OCPP=true` hoặc cấu hình `OCPP_SERVICE_URL` + chạy CSMS; production: kiểm tra trụ đã WebSocket tới đúng chargePointId.",
        },
        { status: 503 },
      );
    }
  }

  return NextResponse.json({
    sessionId: session.id,
    stopKey,
    actorUserId: userId,
    priceVndPerKwh,
    amountVnd: computeAmountVndFromKwh(0, priceVndPerKwh),
    startedAt: session.startedAt,
  });
}
