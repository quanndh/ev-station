"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardMuted, CardMutedLine, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AddFab } from "@/components/ui/add-fab";
import { ClientGuard } from "@/components/auth/ClientGuard";
import { authedFetch } from "@/lib/authClient";
import { LIST_PAGE_SIZE } from "@/lib/apiPagination";
import { formatViDateTime, formatViNumber } from "@/lib/formatVi";
import { LoadMoreButton } from "@/components/ui/load-more-button";

type StationOwnerBrief = { id: string; email: string | null; name: string | null } | null;

type StationRow = {
  id: string;
  name: string;
  slug: string;
  ocppChargePointId: string;
  defaultPriceVndPerKwh: number | null;
  lastSeenAt: string | null;
  ownerId: string | null;
  owner: StationOwnerBrief;
};

type OwnerOption = { id: string; email: string | null; name: string | null };

function ownerLabel(o: OwnerOption) {
  const parts = [o.email, o.name].filter(Boolean);
  return parts.length ? parts.join(" · ") : o.id;
}

export default function AdminStationsPage() {
  const [stations, setStations] = useState<StationRow[]>([]);
  const [stationsHasMore, setStationsHasMore] = useState(false);
  const [stationsNextOffset, setStationsNextOffset] = useState(0);
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
  const [ownerLoadingMore, setOwnerLoadingMore] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerPickerOpen, setOwnerPickerOpen] = useState(false);
  const ownerPickerRef = useRef<HTMLDivElement>(null);

  const filteredOwners = useMemo(() => {
    const q = ownerQuery.trim().toLowerCase();
    if (!q) return ownerOptions;
    return ownerOptions.filter((o) => {
      const email = (o.email ?? "").toLowerCase();
      const name = (o.name ?? "").toLowerCase();
      return email.includes(q) || name.includes(q) || o.id.toLowerCase().includes(q);
    });
  }, [ownerOptions, ownerQuery]);

  async function fetchStationsPage(offset: number, append: boolean) {
    const qs = new URLSearchParams({
      limit: String(LIST_PAGE_SIZE),
      offset: String(offset),
    });
    const r = await authedFetch(`/api/admin/stations?${qs}`);
    const d = await r.json();
    const batch = (d.stations ?? []) as StationRow[];
    if (append) setStations((prev) => [...prev, ...batch]);
    else setStations(batch);
    setStationsHasMore(!!d.hasMore);
    setStationsNextOffset(typeof d.nextOffset === "number" ? d.nextOffset : offset + batch.length);
  }

  useEffect(() => {
    let alive = true;
    setStationsLoading(true);
    fetchStationsPage(0, false)
      .catch(() => {})
      .finally(() => {
        if (alive) setStationsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

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
        <p className="mt-2 text-[color:var(--muted-foreground)]">Danh sách trạm trong hệ thống.</p>
      </div>

      <AddFab
        onClick={() => {
          resetForm();
          setModalOpen(true);
        }}
      />

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {stationsLoading ? (
          <p className="text-sm text-[color:var(--muted-foreground)] md:col-span-2">Đang tải…</p>
        ) : stations.length === 0 ? (
          <Card className="rounded-tl-[3rem] md:col-span-2">
            <CardMuted>Chưa có trạm. Dùng nút Thêm ở góc dưới bên phải để tạo mới.</CardMuted>
          </Card>
        ) : (
          stations.map((s) => (
            <Card key={s.id} className="rounded-tl-[3rem]">
              <CardTitle>{s.name}</CardTitle>
              <div className="mt-4 grid gap-2 text-sm">
                <div className="text-[color:var(--muted-foreground)]">
                  Mã trạm: <span className="font-mono text-[color:var(--foreground)]">{s.slug}</span>
                </div>
                <div className="text-[color:var(--muted-foreground)]">
                  ID trụ sạc (OCPP):{" "}
                  <span className="font-mono text-[color:var(--foreground)]">
                    {s.ocppChargePointId}
                  </span>
                </div>
                <div className="text-[color:var(--muted-foreground)]">
                  Chủ trạm:{" "}
                  <span className="font-semibold text-[color:var(--foreground)]">
                    {s.owner?.email ?? s.owner?.name ?? "—"}
                  </span>
                </div>
                <div className="text-[color:var(--muted-foreground)]">
                  Giá riêng:{" "}
                  <span className="font-semibold text-[color:var(--foreground)]">
                    {s.defaultPriceVndPerKwh != null ? formatViNumber(s.defaultPriceVndPerKwh) : "—"}
                  </span>
                  {s.defaultPriceVndPerKwh != null ? " VNĐ/kWh" : ""}
                </div>
                <div className="text-[color:var(--muted-foreground)]">
                  Lần thấy gần nhất:{" "}
                  <span className="text-[color:var(--foreground)]">
                    {formatViDateTime(s.lastSeenAt)}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  size="sm"
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
                <CardMuted>
                  {qrByStationId[s.id] ? (
                    <button
                      type="button"
                      className="rounded-full border border-[color:var(--border)]/60 bg-white/60 px-3 py-1.5 text-xs font-semibold text-[color:var(--foreground)] hover:bg-white active:scale-[0.99]"
                      onClick={async () => {
                        const url = qrByStationId[s.id];
                        if (!url) return;
                        await navigator.clipboard.writeText(url);
                      }}
                    >
                      Sao chép liên kết
                    </button>
                  ) : (
                    <span>Chưa có link QR</span>
                  )}
                </CardMuted>
              </div>
            </Card>
          ))
        )}
      </div>
      {!stationsLoading ? (
        <LoadMoreButton
          hasMore={stationsHasMore}
          loading={stationsLoadingMore}
          onLoadMore={async () => {
            setStationsLoadingMore(true);
            try {
              await fetchStationsPage(stationsNextOffset, true);
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
            <CardMutedLine className="mt-0">
              Chỉ danh sách chủ trạm; gõ để lọc nhanh trong các mục đã tải.
            </CardMutedLine>
            <LoadMoreButton
              hasMore={ownerHasMore}
              loading={ownerLoadingMore}
              onLoadMore={async () => {
                setOwnerLoadingMore(true);
                try {
                  await fetchOwnersPage(ownerNextOffset, true);
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
            <CardMutedLine className="mt-0">Để trống sẽ dùng giá hệ thống.</CardMutedLine>
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
