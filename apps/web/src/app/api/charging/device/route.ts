import { NextResponse } from "next/server";

import { resolveChargingActorUserId } from "@/lib/authz";

/** Đăng ký thiết bị khách (warm-up user ẩn danh); người đăng nhập chỉ nhận lại userId của họ. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { deviceId } = body as { deviceId?: string };

  const actor = await resolveChargingActorUserId(req, deviceId);
  if ("error" in actor) {
    return NextResponse.json({ error: actor.error }, { status: actor.status });
  }

  return NextResponse.json({ ok: true, userId: actor.userId });
}
