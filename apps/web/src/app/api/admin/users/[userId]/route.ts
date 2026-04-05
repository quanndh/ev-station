import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const u = await requireApiRole(req, ["admin"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;
  const body = await req.json().catch(() => ({}));
  const { disabled } = body as { disabled?: boolean };
  if (typeof disabled !== "boolean") {
    return NextResponse.json({ error: "disabled boolean required" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (target.role === "admin") {
    return NextResponse.json({ error: "Không thể vô hiệu tài khoản quản trị" }, { status: 400 });
  }
  if (target.id === u.sub) {
    return NextResponse.json({ error: "Không thể vô hiệu chính mình" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { disabledAt: disabled ? new Date() : null },
  });

  return NextResponse.json({ ok: true });
}
