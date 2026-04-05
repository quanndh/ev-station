"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClientGuard } from "@/components/auth/ClientGuard";
import { Card } from "@/components/ui/card";
import { ChargingSessionsStatsSummary } from "@/components/reporting/ChargingSessionsStatsSummary";
import { DateRangeFilterCard } from "@/components/reporting/DateRangeFilterCard";
import type { ChargingSessionRangeStats } from "@/components/reporting/types";
import { SessionHistoryDaySection } from "@/components/manage/SessionHistoryDaySection";
import { authedFetch } from "@/lib/authClient";
import { LIST_PAGE_SIZE } from "@/lib/apiPagination";
import { ListPaginationFooter } from "@/components/ui/list-pagination-footer";
import { formatViDate, viDayKeyFromIso } from "@/lib/formatVi";
import { vnDefaultMonthRangeYmd } from "@/lib/vnDateRange";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";

type SessionRow = {
  id: string;
  stationId: string;
  station: { id: string; name: string; slug: string };
  status: string;
  startedAt: string;
  endedAt: string | null;
  kWh: string | null;
  amountVnd: number | null;
  paymentStatus: string;
  userEmail: string | null;
  userName: string | null;
};

export default function AdminChargingHistoryPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(() => vnDefaultMonthRangeYmd().from);
  const [dateTo, setDateTo] = useState(() => vnDefaultMonthRangeYmd().to);
  const [stats, setStats] = useState<ChargingSessionRangeStats | null>(null);

  const loadPage = useCallback(
    async (offset: number, append: boolean) => {
      const qs = new URLSearchParams({
        limit: String(LIST_PAGE_SIZE),
        offset: String(offset),
        dateFrom,
        dateTo,
      });
      const res = await authedFetch(`/api/admin/charging-sessions?${qs}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Không tải được lịch sử");
      const batch = (data.sessions ?? []) as SessionRow[];
      if (append) setSessions((prev) => [...prev, ...batch]);
      else setSessions(batch);
      setHasMore(!!data.hasMore);
      setNextOffset(typeof data.nextOffset === "number" ? data.nextOffset : offset + batch.length);
      if (data.stats && typeof data.stats.totalSessions === "number") {
        setStats({
          totalSessions: data.stats.totalSessions,
          totalKwh: data.stats.totalKwh ?? null,
          totalAmountVnd: data.stats.totalAmountVnd ?? 0,
        });
      }
    },
    [dateFrom, dateTo],
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setPage(1);
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
  }, [loadPage]);

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

  return (
    <ClientGuard allow={["admin"]}>
      <h1 className="font-serif text-3xl font-extrabold tracking-tight sm:text-4xl">Lịch sử sạc</h1>
      <PageBreadcrumb
        className="mt-2"
        items={[
          { href: "/admin", label: "Tổng quan" },
          { label: "Lịch sử sạc" },
        ]}
      />

      <DateRangeFilterCard
        idPrefix="admin-ch"
        className="mt-6 rounded-2xl sm:rounded-tl-[2.5rem]"
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      >
        <ChargingSessionsStatsSummary loading={loading} stats={stats} />
      </DateRangeFilterCard>

      {loading ? (
        <p className="mt-6 text-sm text-[color:var(--muted-foreground)]">Đang tải…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-[color:var(--destructive)]">{error}</p>
      ) : sessions.length === 0 ? (
        <Card className="mt-6 rounded-2xl sm:mt-8 sm:rounded-tl-[2.5rem]" padding="compact">
          <p className="text-sm text-[color:var(--muted-foreground)]">Không có phiên.</p>
        </Card>
      ) : (
        <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-7">
          {sessionsByDay.map(({ dayKey, dayLabel, items }) => (
            <SessionHistoryDaySection
              key={dayKey}
              dayLabel={dayLabel}
              items={items}
              showStationColumn
              stationDetailHref={(id) => `/admin/station/${id}`}
            />
          ))}
        </div>
      )}

      {!loading ? (
        <ListPaginationFooter
          itemCount={sessions.length}
          hasMore={hasMore}
          loadingMore={loadingMore}
          page={page}
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
          onGoToPage={async (p) => {
            if (p < 1) return;
            setLoadingMore(true);
            try {
              await loadPage((p - 1) * LIST_PAGE_SIZE, false);
              setPage(p);
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
            } finally {
              setLoadingMore(false);
            }
          }}
        />
      ) : null}
    </ClientGuard>
  );
}
