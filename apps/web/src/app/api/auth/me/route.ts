import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/apiAuth";

export async function GET(req: Request) {
  const u = requireApiUser(req);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    user: { id: u.sub, role: u.role, email: u.email ?? null, name: u.name ?? null },
  });
}

