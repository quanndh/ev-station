import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@ev/db";
import { signJwt } from "@/lib/jwt";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email, password } = body as { email?: string; password?: string };
  if (!email || !password) {
    return NextResponse.json({ error: "Missing email/password" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      disabledAt: true,
    },
  });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (
    user.disabledAt &&
    (user.role === "station_owner" || user.role === "admin")
  ) {
    return NextResponse.json(
      {
        error:
          "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ để được hỗ trợ.",
        errorCode: "account_disabled",
      },
      { status: 403 },
    );
  }

  const token = signJwt(
    {
      sub: user.id,
      role: user.role as any,
      email: user.email,
      name: user.name,
    },
    60 * 60 * 24 * 7, // 7d
  );

  return NextResponse.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}

