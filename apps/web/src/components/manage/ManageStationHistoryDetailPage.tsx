"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Card, CardMuted, CardTitle } from "@/components/ui/card";
import { ChargingSessionsStatsSummary } from "@/components/reporting/ChargingSessionsStatsSummary";
import { DateRangeFilterCard } from "@/components/reporting/DateRangeFilterCard";
import type { ChargingSessionRangeStats } from "@/components/reporting/types";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { SessionHistoryDaySection } from "@/components/manage/SessionHistoryDaySection";
import { Button } from "@/components/ui/button";
import { authedFetch } from "@/lib/authClient";
import { LIST_PAGE_SIZE } from "@/lib/apiPagination";
import { ListPaginationFooter } from "@/components/ui/list-pagination-footer";
import {
  formatViDate,
  formatViDateTime,
  formatViDurationHm,
  formatViKwh,
  formatViNumber,
  viDayKeyFromIso,
} from "@/lib/formatVi";
import { vnDefaultMonthRangeYmd } from "@/lib/vnDateRange";

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

type LiveActiveSession = {
  id: string;
  userId: string;
  startedAt: string;
  kWh: number | null;
  amountVnd: number | null;
  paymentStatus: string;
  paymentReference: string | null;
  paymentMethod: string | null;
  userEmail: string | null;
  userName: string | null;
};

type LivePayload = {
  status: "available" | "charging";
  priceVndPerKwh: number;
  station: {
    lastSeenAt: string | null;
    disabledAt: string | null;
    disabledBy: "owner" | "admin" | null;
    chargingBlocked: boolean;
    chargingBlockReason: "user_disabled" | "station_disabled" | "owner_account_disabled" | null;
  };
  activeSession: LiveActiveSession | null;
  canStopSession: boolean;
};

export function ManageStationHistoryDetailPage({
  listRootPath,
  manageContext,
}: {
  listRootPath: string;
  manageContext: "admin" | "owner";
}) {
  const params = useParams();
  const stationId = typeof params.stationId === "string" ? params.stationId : "";
  const root = listRootPath.replace(/\/$/, "");

  const [station, setStation] = useState<StationBrief | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsHasMore, setSessionsHasMore] = useState(false);
  const [sessionsNextOffset, setSessionsNextOffset] = useState(0);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sessionsLoadingMore, setSessionsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<LivePayload | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [stopBusy, setStopBusy] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(() => vnDefaultMonthRangeYmd().from);
  const [dateTo, setDateTo] = useState(() => vnDefaultMonthRangeYmd().to);
  const [sessionStats, setSessionStats] = useState<ChargingSessionRangeStats | null>(null);
  const [sessionsRefreshing, setSessionsRefreshing] = useState(false);
  const lastStationIdRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!stationId) return;
    const d = vnDefaultMonthRangeYmd();
    setDateFrom(d.from);
    setDateTo(d.to);
  }, [stationId]);

  const fetchSessionsPage = useCallback(
    async (offset: number, from: string, to: string) => {
      const qs = new URLSearchParams({
        limit: String(LIST_PAGE_SIZE),
        offset: String(offset),
        dateFrom: from,
        dateTo: to,
      });
      const res = await authedFetch(`/api/manage/stations/${stationId}/sessions?${qs}`);
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        return { ok: false as const, notFound: true as const };
      }
      if (!res.ok) throw new Error(data.error ?? "Không tải được lịch sử");
      const batch = (data.sessions ?? []) as SessionRow[];
      let stats: ChargingSessionRangeStats | null = null;
      if (data.stats && typeof data.stats.totalSessions === "number") {
        stats = {
          totalSessions: data.stats.totalSessions,
          totalKwh: data.stats.totalKwh ?? null,
          totalAmountVnd: data.stats.totalAmountVnd ?? 0,
        };
      }
      return {
        ok: true as const,
        station: data.station as StationBrief,
        batch,
        hasMore: !!data.hasMore,
        nextOffset: typeof data.nextOffset === "number" ? data.nextOffset : offset + batch.length,
        stats,
      };
    },
    [stationId],
  );

  const loadSessionsPageAt = useCallback(
    async (offset: number, append: boolean) => {
      const result = await fetchSessionsPage(offset, dateFrom, dateTo);
      if (!result.ok) {
        throw new Error("Không tải được lịch sử");
      }
      if (append) {
        setSessions((prev) => [...prev, ...result.batch]);
      } else {
        setSessions(result.batch);
      }
      setSessionsHasMore(result.hasMore);
      setSessionsNextOffset(result.nextOffset);
      if (result.stats) setSessionStats(result.stats);
    },
    [fetchSessionsPage, dateFrom, dateTo],
  );

  const refreshSessionsFirstPage = useCallback(async () => {
    const result = await fetchSessionsPage(0, dateFrom, dateTo);
    if (result.ok) {
      setSessions(result.batch);
      setSessionsHasMore(result.hasMore);
      setSessionsNextOffset(result.nextOffset);
      setSessionsPage(1);
      if (result.stats) setSessionStats(result.stats);
    }
  }, [fetchSessionsPage, dateFrom, dateTo]);

  const fetchLive = useCallback(async (opts?: { silent?: boolean }) => {
    if (!stationId) return;
    if (!opts?.silent) setLiveLoading(true);
    try {
      const res = await authedFetch(`/api/manage/stations/${stationId}/live`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLive(null);
        return;
      }
      setLive({
        status: data.status,
        priceVndPerKwh: data.priceVndPerKwh ?? 0,
        station: {
          lastSeenAt: data.station?.lastSeenAt ?? null,
          disabledAt: data.station?.disabledAt ?? null,
          disabledBy: data.station?.disabledBy ?? null,
          chargingBlocked: !!data.station?.chargingBlocked,
          chargingBlockReason: data.station?.chargingBlockReason ?? null,
        },
        activeSession: data.activeSession ?? null,
        canStopSession: !!data.canStopSession,
      });
    } catch {
      setLive(null);
    } finally {
      if (!opts?.silent) setLiveLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    if (!stationId) return;
    let alive = true;
    const switched = lastStationIdRef.current !== stationId;
    if (switched) {
      lastStationIdRef.current = stationId;
      setStation(null);
      setSessions([]);
      setSessionsHasMore(false);
      setSessionsNextOffset(0);
      setSessionsPage(1);
      setLive(null);
      setSessionStats(null);
      setLoading(true);
    } else {
      setSessionsRefreshing(true);
    }
    setError(null);
    (async () => {
      const range = switched ? vnDefaultMonthRangeYmd() : { from: dateFrom, to: dateTo };
      try {
        const result = await fetchSessionsPage(0, range.from, range.to);
        if (!alive) return;
        if ("notFound" in result && result.notFound) {
          setError("Không tìm thấy trạm hoặc bạn không có quyền.");
          setStation(null);
          setSessions([]);
          setSessionStats(null);
          return;
        }
        if (!result.ok) return;
        setStation(result.station);
        setSessions(result.batch);
        setSessionsHasMore(result.hasMore);
        setSessionsNextOffset(result.nextOffset);
        setSessionsPage(1);
        setSessionStats(result.stats ?? null);
        setError(null);
      } catch (e: unknown) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      } finally {
        if (alive) {
          setLoading(false);
          setSessionsRefreshing(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [stationId, dateFrom, dateTo, fetchSessionsPage]);

  useEffect(() => {
    if (!stationId || !station) return;
    void fetchLive();
    const t = window.setInterval(() => void fetchLive({ silent: true }), 8000);
    return () => window.clearInterval(t);
  }, [stationId, station?.id, fetchLive]);

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

  async function patchChargingAvailability(disabled: boolean) {
    if (!stationId) return;
    setAvailabilityError(null);
    setAvailabilityBusy(true);
    try {
      let res: Response;
      if (manageContext === "admin") {
        res = await authedFetch(`/api/admin/stations/${stationId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ disabled }),
        });
      } else {
        res = await authedFetch(`/api/manage/stations/${stationId}/availability`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ disabled }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Thao tác thất bại");
      }
      await fetchLive();
    } catch (e: unknown) {
      setAvailabilityError(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setAvailabilityBusy(false);
    }
  }

  async function onStopSession() {
    if (!live?.activeSession) return;
    if (
      !window.confirm("Dừng phiên đang chạy?")
    ) {
      return;
    }
    setStopBusy(true);
    setStopError(null);
    try {
      const res = await authedFetch(`/api/manage/stations/${stationId}/stop-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: live.activeSession.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Không dừng được phiên");
      await fetchLive();
      await refreshSessionsFirstPage();
    } catch (e: unknown) {
      setStopError(e instanceof Error ? e.message : "Lỗi dừng phiên");
    } finally {
      setStopBusy(false);
    }
  }

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
        <Link href={root}>
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
          <h1 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight">{station.name}</h1>
          <PageBreadcrumb
            className="mt-2"
            items={[
              { href: manageContext === "admin" ? "/admin" : "/owner", label: "Tổng quan" },
              { href: root, label: "Trạm" },
            ]}
          />
          <p className="mt-1 font-mono text-xs text-muted-foreground">{station.slug}</p>
        </div>
      </div>

      <Card className="mt-6 rounded-tl-[2.5rem] border-[color:var(--primary)]/25 bg-[color:var(--primary)]/[0.06]">
        <CardTitle className="text-base">Trạng thái trạm</CardTitle>
        {liveLoading && !live ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            Đang tải trạng thái…
          </div>
        ) : null}
        {live ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={
                  live.status === "charging"
                    ? "rounded-full border border-amber-700/25 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950 dark:border-amber-600/40 dark:bg-amber-950 dark:text-amber-50"
                    : "rounded-full border border-emerald-700/25 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-950 dark:border-emerald-600/40 dark:bg-emerald-950 dark:text-emerald-50"
                }
              >
                {live.status === "charging" ? "Đang có phiên sạc" : "Không có phiên đang chạy"}
              </span>
              <span className="text-sm text-muted-foreground">
                Giá:{" "}
                <span className="font-semibold text-foreground">
                  {formatViNumber(live.priceVndPerKwh, { maximumFractionDigits: 0 })} đ/kWh
                </span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Trạm online lần cuối (OCPP):{" "}
              <span className="font-medium text-foreground">
                {live.station.lastSeenAt ? formatViDateTime(live.station.lastSeenAt) : "Chưa có tín hiệu"}
              </span>
            </p>
            {live.activeSession ? (
              <div className="rounded-2xl border border-[color:var(--border)]/70 bg-[color:var(--background)]/90 p-4">
                <p className="text-sm font-semibold text-foreground">Phiên đang chạy</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bắt đầu:{" "}
                  <span className="text-foreground">{formatViDateTime(live.activeSession.startedAt)}</span>
                  {" · "}
                  Đã sạc ~{" "}
                  <span className="text-foreground">
                    {formatViDurationHm(
                      Math.max(0, Date.now() - new Date(live.activeSession.startedAt).getTime()),
                    )}
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  kWh (ước tính hiện tại):{" "}
                  <span className="font-medium text-foreground">
                    {formatViKwh(live.activeSession.kWh)}
                  </span>
                  {" · "}
                  Khách:{" "}
                  <span className="text-foreground">
                    {[live.activeSession.userName, live.activeSession.userEmail].filter(Boolean).join(" · ") ||
                      "—"}
                  </span>
                </p>
                {live.canStopSession ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={stopBusy}
                      className="border-[color:var(--destructive)]/50 text-[color:var(--destructive)] hover:bg-[color:var(--destructive)]/10"
                      onClick={() => void onStopSession()}
                    >
                      {stopBusy ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                          Đang dừng…
                        </>
                      ) : (
                        "Dừng phiên sạc"
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">Chỉ chủ trạm.</p>
                )}
              </div>
            ) : null}
          </div>
        ) : !liveLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Không tải trạng thái.</p>
        ) : null}
        {stopError ? <p className="mt-2 text-sm text-[color:var(--destructive)]">{stopError}</p> : null}
      </Card>

      <Card className="mt-6 rounded-tl-[2.5rem]">
        <CardTitle className="text-base">Tiếp nhận phiên sạc mới</CardTitle>
        {!live ? (
          <p className="mt-2 text-sm text-muted-foreground">Đang tải trạng thái…</p>
        ) : (
          <div className="mt-3 space-y-3">
            {live.station.chargingBlocked ? (
              <p className="text-sm text-muted-foreground">
                {live.station.chargingBlockReason === "owner_account_disabled"
                  ? "Trạm không nhận phiên mới do tài khoản chủ trạm đang bị tạm khóa trên hệ thống. Liên hệ quản trị để được hỗ trợ."
                  : live.station.disabledBy === "admin"
                    ? manageContext === "owner"
                      ? "Quản trị viên đã tạm dừng trạm nhận sạc. Bạn không thể mở lại cho đến khi quản trị thao tác."
                      : "Đang tạm dừng (quản trị). Khách không thể bắt đầu sạc mới."
                    : live.station.disabledBy === "owner"
                      ? manageContext === "owner"
                        ? "Bạn đã tạm dừng trạm. Khách không thể bắt đầu sạc mới."
                        : "Chủ trạm đã tạm dừng nhận sạc."
                      : "Khách không thể bắt đầu sạc mới."}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Trạm đang mở để nhận phiên sạc mới (theo QR / luồng khách).
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {manageContext === "admin" ? (
                live.station.chargingBlockReason === "owner_account_disabled" &&
                !live.station.disabledAt ? (
                  <p className="text-xs text-muted-foreground">Kích hoạt chủ trạm tại Users.</p>
                ) : live.station.chargingBlocked ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={availabilityBusy}
                    onClick={() => void patchChargingAvailability(false)}
                  >
                    {availabilityBusy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        Đang xử lý…
                      </>
                    ) : (
                      "Mở lại nhận sạc"
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={availabilityBusy}
                    onClick={() => void patchChargingAvailability(true)}
                  >
                    {availabilityBusy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        Đang xử lý…
                      </>
                    ) : (
                      "Tạm dừng nhận sạc (admin)"
                    )}
                  </Button>
                )
              ) : live.station.chargingBlockReason === "owner_account_disabled" ? null : live.station
                    .disabledBy === "admin" ? null : !live.station.chargingBlocked ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={availabilityBusy}
                  onClick={() => void patchChargingAvailability(true)}
                >
                  {availabilityBusy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Đang xử lý…
                    </>
                  ) : (
                    "Tạm dừng nhận sạc"
                  )}
                </Button>
              ) : live.station.disabledBy === "owner" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={availabilityBusy}
                  onClick={() => void patchChargingAvailability(false)}
                >
                  {availabilityBusy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Đang xử lý…
                    </>
                  ) : (
                    "Mở lại nhận sạc"
                  )}
                </Button>
              ) : null}
            </div>
            {availabilityError ? (
              <p className="text-sm text-[color:var(--destructive)]">{availabilityError}</p>
            ) : null}
          </div>
        )}
      </Card>

      <div className="mt-8 space-y-4">
        <h2 className="font-serif text-xl font-extrabold tracking-tight">Lịch sử sạc</h2>
        <DateRangeFilterCard
          idPrefix={`st-${stationId.slice(0, 8)}`}
          className="rounded-tl-[2.5rem]"
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        >
          <ChargingSessionsStatsSummary
            loading={sessionsRefreshing}
            stats={sessionStats}
            amountLabel="Tổng tiền"
          />
        </DateRangeFilterCard>
        {sessions.length === 0 ? (
          <Card className="rounded-tl-[3rem]">
            <CardMuted>Không có phiên.</CardMuted>
          </Card>
        ) : (
          <div className="space-y-5 sm:space-y-7">
            {sessionsByDay.map(({ dayKey, dayLabel, items }) => (
              <SessionHistoryDaySection
                key={dayKey}
                dayLabel={dayLabel}
                items={items}
                showStationColumn={false}
              />
            ))}
          </div>
        )}
        <ListPaginationFooter
          itemCount={sessions.length}
          hasMore={sessionsHasMore}
          loadingMore={sessionsLoadingMore}
          page={sessionsPage}
          onLoadMore={async () => {
            setSessionsLoadingMore(true);
            try {
              await loadSessionsPageAt(sessionsNextOffset, true);
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
            } finally {
              setSessionsLoadingMore(false);
            }
          }}
          onGoToPage={async (p) => {
            if (p < 1) return;
            setSessionsLoadingMore(true);
            try {
              await loadSessionsPageAt((p - 1) * LIST_PAGE_SIZE, false);
              setSessionsPage(p);
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
