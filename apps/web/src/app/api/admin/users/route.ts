import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@ev/db";
import { requireApiRole } from "@/lib/apiAuth";
import { listMeta, listTake, parseListPagination, sliceListPage } from "@/lib/apiPagination";

export async function GET(req: Request) {
  const u = await requireApiRole(req, ["admin"]);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const roleFilter = searchParams.get("role");
  const statusFilter = searchParams.get("status");
  const { limit, offset } = parseListPagination(req);

  const where: {
    role?: "user" | "station_owner" | "admin";
    disabledAt?: null | { not: null };
  } = {};

  if (roleFilter === "station_owner" || roleFilter === "admin" || roleFilter === "user") {
    where.role = roleFilter as "user" | "station_owner" | "admin";
  }

  if (statusFilter === "active") {
    where.disabledAt = null;
  } else if (statusFilter === "disabled") {
    where.disabledAt = { not: null };
  }

  const rows = await prisma.user.findMany({
    where: Object.keys(where).length ? where : undefined,
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: listTake(limit),
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      disabledAt: true,
    },
  });
  const { items, hasMore } = sliceListPage(rows, limit);
  const users = items.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    disabledAt: row.disabledAt?.toISOString() ?? null,
  }));
  return NextResponse.json({ users, ...listMeta(offset, users.length, hasMore) });
}

export async function POST(req: Request) {
  const u = await requireApiRole(req, ["admin"]);
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
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Create user failed" }, { status: 400 });
  }
}

