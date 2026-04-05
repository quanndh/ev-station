"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardMuted, CardTitle } from "@/components/ui/card";
import {
  DataTableShell,
  dataTableBodyRowClass,
  dataTableHeadRowClass,
  dataTableTd,
  dataTableTh,
} from "@/components/ui/data-table";
import { AmberStatusPill } from "@/components/ui/amber-status-pill";
import { Button } from "@/components/ui/button";
import { UserRoleBadge } from "@/components/ui/user-role-badge";
import { Modal } from "@/components/ui/modal";
import { AddFab } from "@/components/ui/add-fab";
import { ClientGuard } from "@/components/auth/ClientGuard";
import { authedFetch } from "@/lib/authClient";
import { LIST_PAGE_SIZE } from "@/lib/apiPagination";
import { ListPaginationFooter } from "@/components/ui/list-pagination-footer";
import { Filter } from "lucide-react";
import { formatViDateTime } from "@/lib/formatVi";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: "user" | "station_owner" | "admin";
  createdAt: string;
  /** Hoạt động API gần nhất (Bearer), cập nhật có giới hạn tần suất. */
  updatedAt: string;
  disabledAt: string | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [listPage, setListPage] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [listLoadingMore, setListLoadingMore] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"station_owner" | "admin" | "user">("station_owner");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userToggleBusyId, setUserToggleBusyId] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<
    "" | "user" | "station_owner" | "admin"
  >("");
  const [filterStatus, setFilterStatus] = useState<"" | "active" | "disabled">(
    "",
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersActive = Boolean(filterRole || filterStatus);

  const loadUsers = useCallback(
    async (offset: number, append: boolean) => {
      const qs = new URLSearchParams({
        limit: String(LIST_PAGE_SIZE),
        offset: String(offset),
      });
      if (filterRole) qs.set("role", filterRole);
      if (filterStatus) qs.set("status", filterStatus);
      const res = await authedFetch(`/api/admin/users?${qs}`);
      const d = await res.json();
      const batch = (d.users ?? []) as UserRow[];
      if (append) setUsers((prev) => [...prev, ...batch]);
      else setUsers(batch);
      setHasMore(!!d.hasMore);
      setNextOffset(
        typeof d.nextOffset === "number" ? d.nextOffset : offset + batch.length,
      );
    },
    [filterRole, filterStatus],
  );

  useEffect(() => {
    let alive = true;
    setListPage(1);
    setListLoading(true);
    loadUsers(0, false)
      .catch(() => {})
      .finally(() => {
        if (alive) setListLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [loadUsers]);

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

  async function setUserDisabled(userId: string, disabled: boolean) {
    setUserToggleBusyId(userId);
    try {
      const res = await authedFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ disabled }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          typeof d.error === "string" ? d.error : "Thao tác thất bại",
        );
      await loadUsers((listPage - 1) * LIST_PAGE_SIZE, false);
    } catch {
      /* giữ danh sách cũ */
    } finally {
      setUserToggleBusyId(null);
    }
  }

  return (
    <ClientGuard allow={["admin"]}>
      <div>
        <h1 className="font-serif text-3xl font-extrabold tracking-tight sm:text-4xl">
          Người dùng
        </h1>
        <PageBreadcrumb
          className="mt-2"
          items={[
            { href: "/admin", label: "Tổng quan" },
            { label: "Users" },
          ]}
        />
      </div>

      <AddFab
        onClick={() => {
          resetForm();
          setModalOpen(true);
        }}
      />

      <div className="mt-8 flex flex-col gap-3">
        <div className="flex justify-end md:hidden">
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="relative h-12 w-12 shrink-0 rounded-full p-0 shadow-[var(--shadow-soft)]"
            aria-expanded={filtersOpen}
            aria-label={filtersOpen ? "Đóng bộ lọc" : "Mở bộ lọc"}
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <Filter
              className="pointer-events-none h-6 w-6 shrink-0"
              strokeWidth={2.5}
              aria-hidden
              style={{ color: "var(--primary-foreground)" }}
            />
            {filtersActive ? (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[color:var(--primary)] bg-amber-400" />
            ) : null}
          </Button>
        </div>

        <Card className="rounded-tl-[3rem]">
          <CardTitle className="min-w-0">Danh sách</CardTitle>
          <div
            className={[
              "mt-4 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end",
              filtersOpen ? "flex" : "hidden",
              "md:flex",
            ].join(" ")}
          >
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-[color:var(--foreground)]">
                Vai trò
              </label>
              <select
                value={filterRole}
                onChange={(e) =>
                  setFilterRole(
                    e.target.value as "" | "user" | "station_owner" | "admin",
                  )
                }
                className="h-11 min-w-[11rem] rounded-full border border-[color:var(--border)] bg-white/60 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30"
              >
                <option value="">Tất cả vai trò</option>
                <option value="admin">Quản trị</option>
                <option value="station_owner">Chủ trạm</option>
                <option value="user">Người dùng</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-[color:var(--foreground)]">
                Trạng thái
              </label>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as "" | "active" | "disabled")
                }
                className="h-11 min-w-[11rem] rounded-full border border-[color:var(--border)] bg-white/60 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30"
              >
                <option value="">Tất cả</option>
                <option value="active">Đang hoạt động</option>
                <option value="disabled">Đã vô hiệu</option>
              </select>
            </div>
          </div>
          <CardMuted>
            {listLoading ? "…" : `${users.length} · trang ${listPage}`}
          </CardMuted>
          {!listLoading && users.length === 0 ? (
            <p className="mt-3 text-sm text-[color:var(--muted-foreground)] sm:mt-4">
              {filterRole || filterStatus
                ? "Không có tài khoản khớp bộ lọc."
                : "Chưa có người dùng."}
            </p>
          ) : null}
          {!listLoading && users.length > 0 ? (
            <>
              <div className="mt-3 grid gap-2 text-sm sm:mt-4 md:hidden">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-xl border border-[color:var(--border)]/60 bg-white/40 px-3 py-2 sm:rounded-[1.25rem] sm:px-3.5 sm:py-2.5"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="min-w-0 truncate font-semibold text-[color:var(--foreground)]">
                        {u.email ?? "(chưa có email)"}
                      </span>
                      <UserRoleBadge role={u.role} />
                    </div>
                    <div className="mt-1 flex flex-col gap-1">
                      <span className="text-sm text-[color:var(--foreground)]">
                        {u.name ?? "—"}
                      </span>
                      {u.disabledAt ? (
                        <AmberStatusPill>Đã vô hiệu</AmberStatusPill>
                      ) : null}
                    </div>
                    <div className="mt-1 text-[10px] leading-snug text-[color:var(--muted-foreground)] sm:text-xs">
                      <span className="text-[color:var(--foreground)]/75">
                        API
                      </span>{" "}
                      {formatViDateTime(u.updatedAt)}
                      <span className="mx-1 text-[color:var(--border)]">·</span>
                      <span className="text-[color:var(--foreground)]/75">
                        Tạo
                      </span>{" "}
                      {formatViDateTime(u.createdAt)}
                    </div>
                    {u.role !== "admin" ? (
                      <div className="mt-2">
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          disabled={userToggleBusyId === u.id}
                          onClick={() =>
                            void setUserDisabled(u.id, !u.disabledAt)
                          }
                        >
                          {u.disabledAt ? "Kích hoạt" : "Vô hiệu"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="mt-3 hidden md:mt-4 md:block">
                <DataTableShell minWidthClass="min-w-[720px]">
                  <thead>
                    <tr className={dataTableHeadRowClass}>
                      <th className={dataTableTh}>Email</th>
                      <th className={dataTableTh}>Tên</th>
                      <th className={dataTableTh}>Vai trò</th>
                      <th className={dataTableTh}>Online (API)</th>
                      <th className={dataTableTh}>Tạo TK</th>
                      <th className={dataTableTh}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className={dataTableBodyRowClass}>
                        <td className={`${dataTableTd} font-medium`}>
                          {u.email ?? "(chưa có email)"}
                        </td>
                        <td className={dataTableTd}>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-[color:var(--foreground)]">
                              {u.name ?? "—"}
                            </span>
                            {u.disabledAt ? (
                              <AmberStatusPill>Đã vô hiệu</AmberStatusPill>
                            ) : null}
                          </div>
                        </td>
                        <td className={dataTableTd}>
                          <UserRoleBadge role={u.role} />
                        </td>
                        <td
                          className={`${dataTableTd} text-xs text-[color:var(--muted-foreground)]`}
                        >
                          {formatViDateTime(u.updatedAt)}
                        </td>
                        <td
                          className={`${dataTableTd} text-xs text-[color:var(--muted-foreground)]`}
                        >
                          {formatViDateTime(u.createdAt)}
                        </td>
                        <td className={`${dataTableTd} min-w-[6rem]`}>
                          {u.role !== "admin" ? (
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              disabled={userToggleBusyId === u.id}
                              onClick={() =>
                                void setUserDisabled(u.id, !u.disabledAt)
                              }
                            >
                              {u.disabledAt ? "Kích hoạt" : "Vô hiệu"}
                            </Button>
                          ) : (
                            <span className="text-xs text-[color:var(--muted-foreground)]">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTableShell>
              </div>
            </>
          ) : null}
          {!listLoading ? (
            <ListPaginationFooter
              itemCount={users.length}
              hasMore={hasMore}
              loadingMore={listLoadingMore}
              page={listPage}
              onLoadMore={async () => {
                setListLoadingMore(true);
                try {
                  await loadUsers(nextOffset, true);
                } finally {
                  setListLoadingMore(false);
                }
              }}
              onGoToPage={async (p) => {
                if (p < 1) return;
                setListLoadingMore(true);
                try {
                  await loadUsers((p - 1) * LIST_PAGE_SIZE, false);
                  setListPage(p);
                } finally {
                  setListLoadingMore(false);
                }
              }}
            />
          ) : null}
        </Card>
      </div>

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
              setListPage(1);
              closeModal();
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Tạo thất bại");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-[color:var(--foreground)]">
              Email
            </label>
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
            <label className="text-sm font-semibold text-[color:var(--foreground)]">
              Vai trò
            </label>
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "station_owner" | "admin" | "user")
              }
              className="h-12 w-full rounded-full border border-[color:var(--border)] bg-white/60 px-5 text-sm focus-visible:outline-none"
            >
              <option value="station_owner">Chủ trạm</option>
              <option value="admin">Quản trị</option>
              <option value="user">Người dùng</option>
            </select>
          </div>
          <Button
            size="lg"
            type="submit"
            disabled={loading || !email.trim() || !password}
          >
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
