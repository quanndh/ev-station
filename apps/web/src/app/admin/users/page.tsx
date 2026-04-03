"use client";

import { useEffect, useState } from "react";
import { Card, CardMuted, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AddFab } from "@/components/ui/add-fab";
import { ClientGuard } from "@/components/auth/ClientGuard";
import { authedFetch } from "@/lib/authClient";
import { LIST_PAGE_SIZE } from "@/lib/apiPagination";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { formatViDateTime } from "@/lib/formatVi";

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: "user" | "station_owner" | "admin";
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listLoadingMore, setListLoadingMore] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"station_owner" | "admin" | "user">("station_owner");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadUsers(offset: number, append: boolean) {
    const qs = new URLSearchParams({
      limit: String(LIST_PAGE_SIZE),
      offset: String(offset),
    });
    const res = await authedFetch(`/api/admin/users?${qs}`);
    const d = await res.json();
    const batch = (d.users ?? []) as UserRow[];
    if (append) setUsers((prev) => [...prev, ...batch]);
    else setUsers(batch);
    setHasMore(!!d.hasMore);
    setNextOffset(typeof d.nextOffset === "number" ? d.nextOffset : offset + batch.length);
  }

  useEffect(() => {
    let alive = true;
    setListLoading(true);
    loadUsers(0, false)
      .catch(() => {})
      .finally(() => {
        if (alive) setListLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  function resetForm() {
    setEmail("");
    setPassword("");
    setName("");
    setRole("station_owner");
    setError(null);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  return (
    <ClientGuard allow={["admin"]}>
      <div>
        <h1 className="font-serif text-3xl font-extrabold tracking-tight sm:text-4xl">
          Người dùng
        </h1>
        <p className="mt-2 text-[color:var(--muted-foreground)]">
          Danh sách tài khoản trong hệ thống.
        </p>
      </div>

      <AddFab
        onClick={() => {
          resetForm();
          setModalOpen(true);
        }}
      />

      <Card className="mt-8 rounded-tl-[3rem]">
        <CardTitle>Danh sách</CardTitle>
        <CardMuted>
          {listLoading ? "Đang tải…" : `${users.length} tài khoản đã hiển thị`}
        </CardMuted>
        <div className="mt-4 grid gap-3 text-sm">
          {!listLoading && users.length === 0 ? (
            <p className="text-[color:var(--muted-foreground)]">Chưa có người dùng.</p>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className="rounded-[1.25rem] border border-[color:var(--border)]/60 bg-white/40 px-4 py-3"
              >
                <div className="font-semibold text-[color:var(--foreground)]">
                  {u.email ?? "(chưa có email)"}{" "}
                  <span className="text-xs font-semibold text-[color:var(--muted-foreground)]">
                    • {u.role}
                  </span>
                </div>
                <div className="text-[color:var(--muted-foreground)]">
                  {u.name ?? "—"} · {formatViDateTime(u.createdAt)}
                </div>
              </div>
            ))
          )}
        </div>
        {!listLoading ? (
          <LoadMoreButton
            hasMore={hasMore}
            loading={listLoadingMore}
            onLoadMore={async () => {
              setListLoadingMore(true);
              try {
                await loadUsers(nextOffset, true);
              } finally {
                setListLoadingMore(false);
              }
            }}
          />
        ) : null}
      </Card>

      <Modal open={modalOpen} onClose={closeModal} title="Thêm người dùng">
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            try {
              const res = await authedFetch("/api/admin/users", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  email: email.trim(),
                  password,
                  name: name.trim() || null,
                  role,
                }),
              });
              const d = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(d.error ?? "Tạo thất bại");
              await loadUsers(0, false);
              closeModal();
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Tạo thất bại");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-[color:var(--foreground)]">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-full border border-[color:var(--border)] bg-white/50 px-5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30"
              placeholder="owner@local"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-[color:var(--foreground)]">
              Mật khẩu
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="h-12 w-full rounded-full border border-[color:var(--border)] bg-white/50 px-5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-[color:var(--foreground)]">
              Tên (tuỳ chọn)
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 w-full rounded-full border border-[color:var(--border)] bg-white/50 px-5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30"
              placeholder="Chủ trạm A"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-[color:var(--foreground)]">Vai trò</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "station_owner" | "admin" | "user")}
              className="h-12 w-full rounded-full border border-[color:var(--border)] bg-white/60 px-5 text-sm focus-visible:outline-none"
            >
              <option value="station_owner">Chủ trạm</option>
              <option value="admin">Quản trị</option>
              <option value="user">Người dùng</option>
            </select>
          </div>
          <Button size="lg" type="submit" disabled={loading || !email.trim() || !password}>
            {loading ? "Đang tạo…" : "Tạo"}
          </Button>
          {error ? (
            <div className="rounded-[1.25rem] border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/10 p-4 text-sm">
              Lỗi: {error}
            </div>
          ) : null}
        </form>
      </Modal>
    </ClientGuard>
  );
}
