import { NextResponse } from "next/server";

import { prisma } from "@ev/db";
import { getBearerToken } from "@/lib/apiAuth";
import { verifyJwt } from "@/lib/jwt";

export async function GET(req: Request) {
  const token = getBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const jwt = verifyJwt(token);
  if (!jwt) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.user.findUnique({
    where: { id: jwt.sub },
    select: {
      id: true,
      role: true,
      email: true,
      name: true,
      disabledAt: true,
    },
  });
  if (!row) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    row.disabledAt &&
    (row.role === "station_owner" || row.role === "admin")
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

  return NextResponse.json({
    user: {
      id: row.id,
      role: row.role,
      email: row.email,
      name: row.name,
    },
  });
}
