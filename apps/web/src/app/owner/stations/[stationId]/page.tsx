"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Card, CardMuted, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authedFetch } from "@/lib/authClient";
import { LIST_PAGE_SIZE } from "@/lib/apiPagination";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import {
  formatViDate,
  formatViDurationHm,
  formatViKwh,
  formatViTime,
  viDayKeyFromIso,
} from "@/lib/formatVi";

type StationBrief = { id: string; name: string; slug: string };

type SessionRow = {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  kWh: string | null;
  amountVnd: number | null;
  paymentStatus: string;
  userEmail: string | null;
  userName: string | null;
};

function formatVnd(amount: number | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

const sessionStatusVi: Record<string, string> = {
  active: "Đang sạc",
  completed: "Hoàn thành",
  cancelled: "Đã huỷ",
};

const paymentStatusVi: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  cancelled: "Đã huỷ",
};

function labelSessionStatus(v: string) {
  return sessionStatusVi[v] ?? v;
}

function labelPaymentStatus(v: string) {
  return paymentStatusVi[v] ?? v;
}

function sessionDurationMs(s: SessionRow): number {
  const t0 = new Date(s.startedAt).getTime();
  const t1 = s.endedAt ? new Date(s.endedAt).getTime() : Date.now();
  return Math.max(0, t1 - t0);
}

export default function OwnerStationHistoryPage() {
  const params = useParams();
  const stationId = typeof params.stationId === "string" ? params.stationId : "";

  const [station, setStation] = useState<StationBrief | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsHasMore, setSessionsHasMore] = useState(false);
  const [sessionsNextOffset, setSessionsNextOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sessionsLoadingMore, setSessionsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stationId) return;
    let alive = true;
    setStation(null);
    setSessions([]);
    setSessionsHasMore(false);
    setSessionsNextOffset(0);
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const qs = new URLSearchParams({
          limit: String(LIST_PAGE_SIZE),
          offset: "0",
        });
        const res = await authedFetch(`/api/owner/stations/${stationId}/sessions?${qs}`);
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.status === 404) {
          setError("Không tìm thấy trạm hoặc bạn không có quyền.");
          setStation(null);
          setSessions([]);
          return;
        }
        if (!res.ok) throw new Error(data.error ?? "Không tải được lịch sử");
        setStation(data.station);
        const batch = (data.sessions ?? []) as SessionRow[];
        setSessions(batch);
        setSessionsHasMore(!!data.hasMore);
        setSessionsNextOffset(typeof data.nextOffset === "number" ? data.nextOffset : batch.length);
        setError(null);
      } catch (e: unknown) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [stationId]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, SessionRow[]>();
    for (const s of sessions) {
      const key = viDayKeyFromIso(s.startedAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    const keys = [...map.keys()].sort((a, b) => b.localeCompare(a));
    return keys.map((dayKey) => ({
      dayKey,
      dayLabel: formatViDate(new Date(`${dayKey}T12:00:00+07:00`)),
      items: (map.get(dayKey) ?? []).sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      ),
    }));
  }, [sessions]);

  if (!stationId) {
    return <p className="text-sm text-destructive">Thiếu mã trạm.</p>;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Đang tải…</p>;
  }

  if (error || !station) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{error ?? "Không có dữ liệu."}</p>
        <Link href="/owner/stations">
          <Button variant="outline" size="sm" type="button">
            ← Danh sách trạm
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/owner/stations" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
            ← Trạm
          </Link>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-extrabold tracking-tight">{station.name}</h1>
          <p className="mt-2 text-muted-foreground">
            Mã trạm: <span className="font-mono text-foreground">{station.slug}</span>
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="font-serif text-xl font-extrabold tracking-tight">Lịch sử sạc</h2>
        {sessions.length === 0 ? (
          <Card className="rounded-tl-[3rem]">
            <CardMuted>Chưa có phiên sạc nào tại trạm này.</CardMuted>
          </Card>
        ) : (
          <div className="space-y-10">
            {sessionsByDay.map(({ dayKey, dayLabel, items }) => (
              <section key={dayKey} className="space-y-4">
                <h3 className="border-b border-border/60 pb-2 font-serif text-lg font-extrabold tracking-tight text-foreground">
                  Ngày {dayLabel}
                </h3>
                <div className="grid gap-4">
                  {items.map((s) => (
                    <Card key={s.id} className="rounded-tl-[2.5rem]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-base font-semibold">
                            Từ {formatViTime(s.startedAt)} đến{" "}
                            {s.endedAt ? formatViTime(s.endedAt) : "đang sạc"}
                          </CardTitle>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Thời gian sạc:{" "}
                            <span className="font-medium text-foreground">
                              {formatViDurationHm(sessionDurationMs(s))}
                            </span>
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                          <span className="rounded-full border border-border/60 bg-white/60 px-2 py-1">
                            {labelSessionStatus(s.status)}
                          </span>
                          <span className="rounded-full border border-border/60 bg-white/60 px-2 py-1">
                            {labelPaymentStatus(s.paymentStatus)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                        <div>
                          Người dùng:{" "}
                          <span className="text-foreground">
                            {[s.userName, s.userEmail].filter(Boolean).join(" · ") || "—"}
                          </span>
                        </div>
                        <div>
                          Điện năng (kWh): <span className="text-foreground">{formatViKwh(s.kWh)}</span>
                        </div>
                        <div>
                          Tiền: <span className="text-foreground">{formatVnd(s.amountVnd)}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        <LoadMoreButton
          hasMore={sessionsHasMore}
          loading={sessionsLoadingMore}
          onLoadMore={async () => {
            setSessionsLoadingMore(true);
            try {
              const qs = new URLSearchParams({
                limit: String(LIST_PAGE_SIZE),
                offset: String(sessionsNextOffset),
              });
              const res = await authedFetch(`/api/owner/stations/${stationId}/sessions?${qs}`);
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data.error ?? "Không tải thêm được");
              const batch = (data.sessions ?? []) as SessionRow[];
              setSessions((prev) => [...prev, ...batch]);
              setSessionsHasMore(!!data.hasMore);
              setSessionsNextOffset(
                typeof data.nextOffset === "number" ? data.nextOffset : sessionsNextOffset + batch.length,
              );
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
            } finally {
              setSessionsLoadingMore(false);
            }
          }}
        />
      </div>
    </>
  );
}
