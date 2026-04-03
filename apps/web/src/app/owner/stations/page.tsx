"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Card, CardMutedLine, CardTitle } from "@/components/ui/card";
import { authedFetch } from "@/lib/authClient";
import { LIST_PAGE_SIZE } from "@/lib/apiPagination";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { formatViDateTime, formatViNumber } from "@/lib/formatVi";

type StationRow = {
  id: string;
  name: string;
  slug: string;
  ocppChargePointId: string;
  defaultPriceVndPerKwh: number | null;
  lastSeenAt: string | null;
};

export default function OwnerStationsPage() {
  const [stations, setStations] = useState<StationRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPage(offset: number, append: boolean) {
    const qs = new URLSearchParams({
      limit: String(LIST_PAGE_SIZE),
      offset: String(offset),
    });
    const res = await authedFetch(`/api/owner/stations?${qs}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Không tải được danh sách trạm");
    const batch = (data.stations ?? []) as StationRow[];
    if (append) setStations((prev) => [...prev, ...batch]);
    else setStations(batch);
    setHasMore(!!data.hasMore);
    setNextOffset(typeof data.nextOffset === "number" ? data.nextOffset : offset + batch.length);
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    loadPage(0, false)
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Đang tải…</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <>
      <h1 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight">Trạm của bạn</h1>
      <p className="mt-2 text-muted-foreground">Chọn một trạm để xem lịch sử sạc.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {stations.map((s) => (
          <Link key={s.id} href={`/owner/stations/${s.id}`} className="block transition hover:opacity-95">
            <Card className="rounded-tl-[3rem] h-full cursor-pointer">
              <CardTitle>{s.name}</CardTitle>
              <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                <div>
                  Mã trạm: <span className="font-mono text-foreground">{s.slug}</span>
                </div>
                <div>
                  ID trụ sạc (OCPP):{" "}
                  <span className="font-mono text-foreground">{s.ocppChargePointId}</span>
                </div>
                <div>
                  Giá riêng:{" "}
                  <span className="font-semibold text-foreground">
                    {s.defaultPriceVndPerKwh != null ? formatViNumber(s.defaultPriceVndPerKwh) : "—"}
                  </span>
                  {s.defaultPriceVndPerKwh != null ? " VNĐ/kWh" : ""}
                </div>
                <div>
                  Lần thấy gần nhất:{" "}
                  <span className="text-foreground">{formatViDateTime(s.lastSeenAt)}</span>
                </div>
              </div>
              <CardMutedLine className="mt-4">Nhấn để xem lịch sử sạc · Một đầu nối mỗi trạm (MVP).</CardMutedLine>
            </Card>
          </Link>
        ))}
      </div>

      {stations.length === 0 ? (
        <div className="mt-6 text-muted-foreground">Bạn chưa có trạm nào.</div>
      ) : null}

      <LoadMoreButton
        hasMore={hasMore}
        loading={loadingMore}
        onLoadMore={async () => {
          setLoadingMore(true);
          try {
            await loadPage(nextOffset, true);
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
          } finally {
            setLoadingMore(false);
          }
        }}
      />
    </>
  );
}
