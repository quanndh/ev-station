"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Filter } from "lucide-react";
import { Card, CardMuted, CardMutedLine, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AddFab } from "@/components/ui/add-fab";
import { ClientGuard } from "@/components/auth/ClientGuard";
import { authedFetch } from "@/lib/authClient";
import { LIST_PAGE_SIZE } from "@/lib/apiPagination";
import { ListPaginationFooter } from "@/components/ui/list-pagination-footer";
import {
  ManageStationCard,
  ManageStationsTable,
  stationRowChargingBlocked,
  type ManageStationListRow,
} from "@/components/manage/ManageStationListPage";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";

type OwnerOption = { id: string; email: string | null; name: string | null };

function ownerLabel(o: OwnerOption) {
  const parts = [o.email, o.name].filter(Boolean);
  return parts.length ? parts.join(" · ") : o.id;
}

export default function AdminStationsPage() {
  const [stations, setStations] = useState<ManageStationListRow[]>([]);
  const [stationsHasMore, setStationsHasMore] = useState(false);
  const [stationsNextOffset, setStationsNextOffset] = useState(0);
  const [stationsPage, setStationsPage] = useState(1);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [stationsLoadingMore, setStationsLoadingMore] = useState(false);
  const [qrByStationId, setQrByStationId] = useState<Record<string, string | null>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ocppChargePointId, setOcppChargePointId] = useState("");
  const [defaultPrice, setDefaultPrice] = useState<string>("");
  const [ownerOptions, setOwnerOptions] = useState<OwnerOption[]>([]);
  const [ownerHasMore, setOwnerHasMore] = useState(false);
  const [ownerNextOffset, setOwnerNextOffset] = useState(0);
  const [ownerPage, setOwnerPage] = useState(1);
  const [ownerLoadingMore, setOwnerLoadingMore] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerPickerOpen, setOwnerPickerOpen] = useState(false);
  const ownerPickerRef = useRef<HTMLDivElement>(null);
  const qrCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [qrCopiedStationId, setQrCopiedStationId] = useState<string | null>(null);
  const [stationPatchBusyId, setStationPatchBusyId] = useState<string | null>(null);
  /** "" = tất cả, "_none" = chưa gán chủ, còn lại = ownerId */
  const [filterOwnerId, setFilterOwnerId] = useState<string>("");
  const [filterChargingStatus, setFilterChargingStatus] = useState<"all" | "open" | "blocked">(
    "all",
  );
  const [stationNameInput, setStationNameInput] = useState("");
  const [stationNameDebounced, setStationNameDebounced] = useState("");
  const [ownerFilterOptions, setOwnerFilterOptions] = useState<OwnerOption[]>([]);
  const [stationFiltersOpen, setStationFiltersOpen] = useState(false);
  const stationFiltersActive =
    Boolean(filterOwnerId) ||
    filterChargingStatus !== "all" ||
    Boolean(stationNameDebounced);

  useEffect(() => {
    const t = window.setTimeout(() => setStationNameDebounced(stationNameInput.trim()), 400);
    return () => window.clearTimeout(t);
  }, [stationNameInput]);

  useEffect(() => {
    void (async () => {
      try {
        const qs = new URLSearchParams({
          role: "station_owner",
          limit: "500",
          offset: "0",
        });
        const r = await authedFetch(`/api/admin/users?${qs}`);
        const d = await r.json().catch(() => ({}));
        const batch = (d.users ?? []) as { id: string; email: string | null; name: string | null }[];
        setOwnerFilterOptions(
          batch.map((u) => ({ id: u.id, email: u.email, name: u.name })),
        );
      } catch {
        setOwnerFilterOptions([]);
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (qrCopiedTimerRef.current) clearTimeout(qrCopiedTimerRef.current);
    };
  }, []);

  function flashQrCopied(stationId: string) {
    if (qrCopiedTimerRef.current) clearTimeout(qrCopiedTimerRef.current);
    setQrCopiedStationId(stationId);
    qrCopiedTimerRef.current = setTimeout(() => {
      setQrCopiedStationId(null);
      qrCopiedTimerRef.current = null;
    }, 2400);
  }

  async function copyQrUrl(stationId: string, url: string | null | undefined) {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      flashQrCopied(stationId);
    } catch {
      window.alert("Không sao chép được. Thử lại hoặc copy thủ công.");
    }
  }

  const filteredOwners = useMemo(() => {
    const q = ownerQuery.trim().toLowerCase();
    if (!q) return ownerOptions;
    return ownerOptions.filter((o) => {
      const email = (o.email ?? "").toLowerCase();
      const name = (o.name ?? "").toLowerCase();
      return email.includes(q) || name.includes(q) || o.id.toLowerCase().includes(q);
    });
  }, [ownerOptions, ownerQuery]);

  async function setStationChargingDisabled(stationId: string, disabled: boolean) {
    setStationPatchBusyId(stationId);
    try {
      const res = await authedFetch(`/api/admin/stations/${stationId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ disabled }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof d.error === "string" ? d.error : "Thao tác thất bại");
      await fetchStationsPage((stationsPage - 1) * LIST_PAGE_SIZE, false);
    } catch {
      /* ignore */
    } finally {
      setStationPatchBusyId(null);
    }
  }

  const fetchStationsPage = useCallback(
    async (offset: number, append: boolean) => {
      const qs = new URLSearchParams({
        limit: String(LIST_PAGE_SIZE),
        offset: String(offset),
      });
      if (filterOwnerId === "_none") qs.set("ownerId", "_none");
      else if (filterOwnerId) qs.set("ownerId", filterOwnerId);
      if (filterChargingStatus !== "all") qs.set("status", filterChargingStatus);
      if (stationNameDebounced) qs.set("q", stationNameDebounced);
      const r = await authedFetch(`/api/admin/stations?${qs}`);
      const d = await r.json();
      const batch = (d.stations ?? []) as ManageStationListRow[];
      if (append) setStations((prev) => [...prev, ...batch]);
      else setStations(batch);
      setStationsHasMore(!!d.hasMore);
      setStationsNextOffset(typeof d.nextOffset === "number" ? d.nextOffset : offset + batch.length);
    },
    [filterOwnerId, filterChargingStatus, stationNameDebounced],
  );

  useEffect(() => {
    let alive = true;
    setStationsPage(1);
    setStationsLoading(true);
    fetchStationsPage(0, false)
      .catch(() => {})
      .finally(() => {
        if (alive) setStationsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [fetchStationsPage]);

  async function fetchOwnersPage(offset: number, append: boolean) {
    const qs = new URLSearchParams({
      role: "station_owner",
      limit: String(LIST_PAGE_SIZE),
      offset: String(offset),
    });
    const r = await authedFetch(`/api/admin/users?${qs}`);
    const d = await r.json();
    const batch = (d.users ?? []) as OwnerOption[];
    if (append) setOwnerOptions((prev) => [...prev, ...batch]);
    else setOwnerOptions(batch);
    setOwnerHasMore(!!d.hasMore);
    setOwnerNextOffset(typeof d.nextOffset === "number" ? d.nextOffset : offset + batch.length);
  }

  useEffect(() => {
    if (!modalOpen) return;
    setOwnerPage(1);
    fetchOwnersPage(0, false).catch(() => {});
  }, [modalOpen]);

  useEffect(() => {
    if (!ownerPickerOpen || !modalOpen) return;
    function onDocPointerDown(e: PointerEvent) {
      const el = ownerPickerRef.current;
      if (el && !el.contains(e.target as Node)) setOwnerPickerOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [ownerPickerOpen, modalOpen]);

  function resetForm() {
    setName("");
    setSlug("");
    setOcppChargePointId("");
    setDefaultPrice("");
    setSelectedOwnerId("");
    setOwnerQuery("");
    setOwnerPickerOpen(false);
    setCreateError(null);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  return (
    <ClientGuard allow={["admin"]}>
      <div>
        <h1 className="font-serif text-3xl font-extrabold tracking-tight sm:text-4xl">
          Trạm sạc
        </h1>
        <PageBreadcrumb
          className="mt-2"
          items={[
            { href: "/admin", label: "Tổng quan" },
            { label: "Trạm" },
          ]}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex justify-end md:hidden">
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="relative h-12 w-12 shrink-0 rounded-full p-0 shadow-[var(--shadow-soft)]"
            aria-expanded={stationFiltersOpen}
            aria-label={stationFiltersOpen ? "Đóng bộ lọc" : "Mở bộ lọc"}
            onClick={() => setStationFiltersOpen((o) => !o)}
          >
            <Filter
              className="pointer-events-none h-6 w-6 shrink-0"
              strokeWidth={2.5}
              aria-hidden
              style={{ color: "var(--primary-foreground)" }}
            />
            {stationFiltersActive ? (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[color:var(--primary)] bg-amber-400" />
            ) : null}
          </Button>
        </div>

        <Card
          className={[
            "rounded-tl-[2.5rem] p-4 md:p-6",
            !stationFiltersOpen ? "hidden md:block" : "",
          ].join(" ")}
        >
          <CardTitle className="mb-3 hidden text-base md:block">Bộ lọc</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 md:mt-0">
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-[color:var(--foreground)]">Chủ trạm</label>
            <select
              value={filterOwnerId}
              onChange={(e) => setFilterOwnerId(e.target.value)}
              className="h-11 w-full rounded-full border border-[color:var(--border)] bg-white/60 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30"
            >
              <option value="">Tất cả</option>
              <option value="_none">Chưa gán chủ (admin)</option>
              {ownerFilterOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {ownerLabel(o)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-[color:var(--foreground)]">
              Nhận sạc mới
            </label>
            <select
              value={filterChargingStatus}
              onChange={(e) =>
                setFilterChargingStatus(e.target.value as "all" | "open" | "blocked")
              }
              className="h-11 w-full rounded-full border border-[color:var(--border)] bg-white/60 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30"
            >
              <option value="all">Tất cả</option>
              <option value="open">Đang nhận sạc</option>
              <option value="blocked">Không nhận sạc</option>
            </select>
          </div>
          <div className="grid gap-1.5 sm:col-span-2 lg:col-span-2">
            <label className="text-xs font-semibold text-[color:var(--foreground)]">
              Tên hoặc mã trạm
            </label>
            <input
              value={stationNameInput}
              onChange={(e) => setStationNameInput(e.target.value)}
              placeholder="Gõ để lọc (tên, slug)…"
              className="h-11 w-full rounded-full border border-[color:var(--border)] bg-white/50 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30"
            />
          </div>
        </div>
        </Card>
      </div>

      <AddFab
        onClick={() => {
          resetForm();
          setModalOpen(true);
        }}
      />

      {stationsLoading ? (
        <p className="mt-6 text-sm text-[color:var(--muted-foreground)]">Đang tải…</p>
      ) : stations.length === 0 ? (
        <Card className="mt-6 rounded-tl-[3rem]">
          <CardMuted>
            {filterOwnerId || filterChargingStatus !== "all" || stationNameDebounced
              ? "Không có kết quả."
              : "Chưa có trạm."}
          </CardMuted>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 md:hidden">
            {stations.map((s) => (
              <ManageStationCard
                key={s.id}
                station={s}
                detailHref={`/admin/station/${s.id}`}
                showOwner
                footer={
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                    {s.disabledAt ? (
                      <Button
                        size="xs"
                        variant="outline"
                        type="button"
                        disabled={stationPatchBusyId === s.id}
                        onClick={() => void setStationChargingDisabled(s.id, false)}
                      >
                        Mở nhận sạc
                      </Button>
                    ) : stationRowChargingBlocked(s) ? (
                      <span className="text-[11px] font-medium text-[color:var(--muted-foreground)]">
                        Chủ trạm bị khóa
                      </span>
                    ) : (
                      <Button
                        size="xs"
                        variant="outline"
                        type="button"
                        disabled={stationPatchBusyId === s.id}
                        onClick={() => void setStationChargingDisabled(s.id, true)}
                      >
                        Tạm dừng nhận sạc
                      </Button>
                    )}
                    <Button
                      size="xs"
                      variant="outline"
                      type="button"
                      onClick={async () => {
                        const res = await authedFetch(`/api/admin/stations/${s.id}/qr`, {
                          method: "POST",
                        });
                        const d = await res.json().catch(() => ({}));
                        setQrByStationId((prev) => ({ ...prev, [s.id]: d.qrUrl ?? null }));
                      }}
                    >
                      Tạo link QR
                    </Button>
                    <div className="flex flex-col gap-1">
                      {qrByStationId[s.id] ? (
                        <Button
                          size="xs"
                          variant="ghost"
                          type="button"
                          onClick={() => void copyQrUrl(s.id, qrByStationId[s.id])}
                        >
                          Sao chép liên kết
                        </Button>
                      ) : (
                        <span className="text-xs text-[color:var(--muted-foreground)]">Chưa có link QR</span>
                      )}
                      {qrCopiedStationId === s.id ? (
                        <span className="text-xs font-semibold text-[color:var(--secondary)]">
                          Đã sao chép
                        </span>
                      ) : null}
                    </div>
                  </div>
                }
              />
            ))}
          </div>
          <div className="mt-6 hidden md:mt-8 md:block">
            <ManageStationsTable
              stations={stations}
              getDetailHref={(id) => `/admin/station/${id}`}
              showOwner
              actionsColumn={(s) => (
                <div className="flex max-w-[9.5rem] flex-col items-start gap-1.5">
                  {s.disabledAt ? (
                    <Button
                      size="xs"
                      variant="outline"
                      type="button"
                      disabled={stationPatchBusyId === s.id}
                      onClick={() => void setStationChargingDisabled(s.id, false)}
                    >
                      Mở sạc
                    </Button>
                  ) : stationRowChargingBlocked(s) ? (
                    <span className="text-[10px] font-medium text-[color:var(--muted-foreground)]">
                      Chủ khóa
                    </span>
                  ) : (
                    <Button
                      size="xs"
                      variant="outline"
                      type="button"
                      disabled={stationPatchBusyId === s.id}
                      onClick={() => void setStationChargingDisabled(s.id, true)}
                    >
                      Dừng sạc
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="outline"
                    type="button"
                    onClick={async () => {
                      const res = await authedFetch(`/api/admin/stations/${s.id}/qr`, {
                        method: "POST",
                      });
                      const d = await res.json().catch(() => ({}));
                      setQrByStationId((prev) => ({ ...prev, [s.id]: d.qrUrl ?? null }));
                    }}
                  >
                    Tạo QR
                  </Button>
                  {qrByStationId[s.id] ? (
                    <>
                      <Button
                        size="xs"
                        variant="ghost"
                        type="button"
                        className="px-2"
                        onClick={() => void copyQrUrl(s.id, qrByStationId[s.id])}
                      >
                        Sao chép link
                      </Button>
                      {qrCopiedStationId === s.id ? (
                        <span
                          className="text-[11px] font-semibold leading-snug text-[color:var(--secondary)]"
                          role="status"
                        >
                          Đã sao chép
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-[11px] font-medium text-[color:var(--accent-foreground)]/80">
                      Chưa có QR
                    </span>
                  )}
                </div>
              )}
            />
          </div>
        </>
      )}
      {!stationsLoading ? (
        <ListPaginationFooter
          itemCount={stations.length}
          hasMore={stationsHasMore}
          loadingMore={stationsLoadingMore}
          page={stationsPage}
          onLoadMore={async () => {
            setStationsLoadingMore(true);
            try {
              await fetchStationsPage(stationsNextOffset, true);
            } finally {
              setStationsLoadingMore(false);
            }
          }}
          onGoToPage={async (p) => {
            if (p < 1) return;
            setStationsLoadingMore(true);
            try {
              await fetchStationsPage((p - 1) * LIST_PAGE_SIZE, false);
              setStationsPage(p);
            } finally {
              setStationsLoadingMore(false);
            }
          }}
        />
      ) : null}

      <Modal open={modalOpen} onClose={closeModal} title="Thêm trạm sạc">
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setCreateError(null);
            if (!name.trim() || !slug.trim() || !ocppChargePointId.trim()) {
              setCreateError("Vui lòng nhập đủ tên trạm, mã trạm và ID trụ sạc (OCPP).");
              return;
            }
            const p =
              defaultPrice.trim() === "" ? null : Math.floor(Number(defaultPrice.trim()));
            if (defaultPrice.trim() !== "" && (!Number.isFinite(p) || (p as number) <= 0)) {
              setCreateError("Giá không hợp lệ.");
              return;
            }

            setCreating(true);
            try {
              const res = await authedFetch("/api/admin/stations", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  name: name.trim(),
                  slug: slug.trim(),
                  ocppChargePointId: ocppChargePointId.trim(),
                  defaultPriceVndPerKwh: p,
                  ownerId: selectedOwnerId.trim() === "" ? null : selectedOwnerId.trim(),
                }),
              });
              const d = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(d.error ?? "Tạo trạm thất bại");

              await fetchStationsPage(0, false);
              setStationsPage(1);
              closeModal();
            } catch (err: unknown) {
              setCreateError(err instanceof Error ? err.message : "Tạo trạm thất bại");
            } finally {
              setCreating(false);
            }
          }}
        >
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-[color:var(--foreground)]">
              Tên trạm
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 w-full rounded-full border border-[color:var(--border)] bg-white/50 px-5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30"
              placeholder="EV Green — Quận 1"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-[color:var(--foreground)]">Mã trạm</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="h-12 w-full rounded-full border border-[color:var(--border)] bg-white/50 px-5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30"
              placeholder="tram-quan-1"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-[color:var(--foreground)]">
              ID trụ sạc (OCPP)
            </label>
            <input
              value={ocppChargePointId}
              onChange={(e) => setOcppChargePointId(e.target.value)}
              className="h-12 w-full rounded-full border border-[color:var(--border)] bg-white/50 px-5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30"
              placeholder="CP-0001"
            />
          </div>
          <div className="grid gap-2" ref={ownerPickerRef}>
            <label className="text-sm font-semibold text-[color:var(--foreground)]">
              Chủ trạm (tuỳ chọn)
            </label>
            {selectedOwnerId ? (
              <div className="flex flex-wrap items-center gap-2 rounded-[1.25rem] border border-[color:var(--border)]/60 bg-white/50 px-4 py-2 text-sm">
                <span className="font-medium text-[color:var(--foreground)]">
                  {ownerLabel(
                    ownerOptions.find((o) => o.id === selectedOwnerId) ?? {
                      id: selectedOwnerId,
                      email: null,
                      name: null,
                    },
                  )}
                </span>
                <button
                  type="button"
                  className="rounded-full border border-[color:var(--border)]/70 bg-white/80 px-3 py-1 text-xs font-semibold text-[color:var(--muted-foreground)] hover:bg-white"
                  onClick={() => setSelectedOwnerId("")}
                >
                  Gỡ
                </button>
              </div>
            ) : null}
            <input
              type="search"
              value={ownerQuery}
              onChange={(e) => {
                setOwnerQuery(e.target.value);
                setOwnerPickerOpen(true);
              }}
              onFocus={() => setOwnerPickerOpen(true)}
              placeholder="Tìm email, tên hoặc mã…"
              autoComplete="off"
              className="h-12 w-full rounded-full border border-[color:var(--border)] bg-white/50 px-5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30"
            />
            {ownerPickerOpen ? (
              <ul className="max-h-48 overflow-y-auto rounded-[1.25rem] border border-[color:var(--border)]/60 bg-[color:var(--background)] py-1 shadow-[var(--shadow-soft)]">
                <li>
                  <button
                    type="button"
                    className={[
                      "w-full px-4 py-2.5 text-left text-sm font-medium transition hover:bg-[color:var(--muted)]/50",
                      !selectedOwnerId ? "bg-[color:var(--primary)]/10" : "",
                    ].join(" ")}
                    onClick={() => {
                      setSelectedOwnerId("");
                      setOwnerQuery("");
                      setOwnerPickerOpen(false);
                    }}
                  >
                    Chưa gán chủ trạm
                  </button>
                </li>
                {filteredOwners.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
                    Không tìm thấy chủ trạm.
                  </li>
                ) : (
                  filteredOwners.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        className={[
                          "w-full px-4 py-2.5 text-left text-sm transition hover:bg-[color:var(--muted)]/50",
                          selectedOwnerId === o.id ? "bg-[color:var(--primary)]/10 font-semibold" : "",
                        ].join(" ")}
                        onClick={() => {
                          setSelectedOwnerId(o.id);
                          setOwnerQuery("");
                          setOwnerPickerOpen(false);
                        }}
                      >
                        {ownerLabel(o)}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
            <CardMutedLine className="mt-0">Lọc trong danh sách.</CardMutedLine>
            <ListPaginationFooter
              itemCount={ownerOptions.length}
              hasMore={ownerHasMore}
              loadingMore={ownerLoadingMore}
              page={ownerPage}
              onLoadMore={async () => {
                setOwnerLoadingMore(true);
                try {
                  await fetchOwnersPage(ownerNextOffset, true);
                } finally {
                  setOwnerLoadingMore(false);
                }
              }}
              onGoToPage={async (p) => {
                if (p < 1) return;
                setOwnerLoadingMore(true);
                try {
                  await fetchOwnersPage((p - 1) * LIST_PAGE_SIZE, false);
                  setOwnerPage(p);
                } finally {
                  setOwnerLoadingMore(false);
                }
              }}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-[color:var(--foreground)]">
              Giá riêng (tuỳ chọn, VNĐ/kWh)
            </label>
            <input
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(e.target.value)}
              inputMode="numeric"
              className="h-12 w-full rounded-full border border-[color:var(--border)] bg-white/50 px-5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30"
              placeholder="3500"
            />
            <CardMutedLine className="mt-0">Trống = giá hệ thống.</CardMutedLine>
          </div>
          <Button size="lg" type="submit" disabled={creating}>
            {creating ? "Đang tạo…" : "Tạo trạm"}
          </Button>
          {createError ? (
            <div className="rounded-[1.25rem] border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/10 p-4 text-sm">
              Lỗi: {createError}
            </div>
          ) : null}
        </form>
      </Modal>
    </ClientGuard>
  );
}
