import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";
import { listMeta, listTake, parseListPagination, sliceListPage } from "@/lib/apiPagination";

export async function GET(req: Request) {
  const u = requireApiRole(req, ["admin"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const roleFilter = searchParams.get("role");
  const { limit, offset } = parseListPagination(req);

  const rows = await prisma.user.findMany({
    where:
      roleFilter === "station_owner"
        ? { role: "station_owner" }
        : roleFilter === "admin" || roleFilter === "user"
          ? { role: roleFilter as "admin" | "user" }
          : undefined,
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: listTake(limit),
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  const { items, hasMore } = sliceListPage(rows, limit);
  return NextResponse.json({ users: items, ...listMeta(offset, items.length, hasMore) });
}

export async function POST(req: Request) {
  const u = requireApiRole(req, ["admin"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { email, password, name, role } = body as {
    email?: string;
    password?: string;
    name?: string | null;
    role?: "station_owner" | "admin" | "user";
  };

  if (!email || !password) {
    return NextResponse.json({ error: "Missing email/password" }, { status: 400 });
  }
  const finalRole = role ?? "station_owner";
  if (!["station_owner", "admin", "user"].includes(finalRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password too short" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name: name ?? null,
        role: finalRole as any,
        passwordHash,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    return NextResponse.json({ user });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Create user failed" }, { status: 400 });
  }
}

