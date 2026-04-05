import { prisma } from "@ev/db";

import { finalizeChargingSessionLocal } from "@/lib/chargingCheckout";
import { chargingSkipOcpp } from "@/lib/chargingSkipOcpp";
import { remoteStop } from "@/lib/ocppClient";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Kết thúc mọi phiên đang active tại trạm (khi tạm khóa trạm).
 * Thử RemoteStopTransaction nếu có OCPP; nếu sau thời gian chờ vẫn active thì hoàn tất trên DB như luồng demo/skip OCPP.
 */
export async function endActiveChargingSessionsForStation(stationId: string): Promise<void> {
  const active = await prisma.chargingSession.findMany({
    where: { stationId, status: "active" },
    select: { id: true },
  });
  if (active.length === 0) return;

  if (chargingSkipOcpp()) {
    for (const { id } of active) {
      await finalizeChargingSessionLocal(id);
    }
    return;
  }

  await Promise.all(
    active.map(async ({ id }) => {
      try {
        await remoteStop({ sessionId: id });
      } catch {
        // Trạm offline / chưa map transaction OCPP — vẫn consolidate phía dưới
      }
    }),
  );

  for (let i = 0; i < 15; i++) {
    await sleep(400);
    const still = await prisma.chargingSession.count({
      where: { stationId, status: "active" },
    });
    if (still === 0) return;
  }

  const remaining = await prisma.chargingSession.findMany({
    where: { stationId, status: "active" },
    select: { id: true },
  });
  for (const { id } of remaining) {
    await finalizeChargingSessionLocal(id);
  }
}
