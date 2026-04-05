"use client";

import { useCallback, useEffect, useState } from "react";

import { ClientGuard } from "@/components/auth/ClientGuard";
import { PaymentsListByDay, type PaymentListRow } from "@/components/payments/PaymentsListByDay";
import { DateRangeFilterCard } from "@/components/reporting/DateRangeFilterCard";
import { PaymentTotalStatsSummary } from "@/components/reporting/PaymentTotalStatsSummary";
import { authedFetch } from "@/lib/authClient";
import { LIST_PAGE_SIZE } from "@/lib/apiPagination";
import { ListPaginationFooter } from "@/components/ui/list-pagination-footer";
import { vnDefaultMonthRangeYmd } from "@/lib/vnDateRange";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentListRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => vnDefaultMonthRangeYmd().from);
  const [dateTo, setDateTo] = useState(() => vnDefaultMonthRangeYmd().to);
  const [totalAmountVnd, setTotalAmountVnd] = useState<number | null>(null);
  const [paymentCount, setPaymentCount] = useState<number | null>(null);

  const loadPage = useCallback(
    async (offset: number, append: boolean) => {
      const qs = new URLSearchParams({
        limit: String(LIST_PAGE_SIZE),
        offset: String(offset),
        dateFrom,
        dateTo,
      });
      const r = await authedFetch(`/api/admin/payments?${qs}`);
      const d = await r.json();
      const batch = (d.payments ?? []) as PaymentListRow[];
      if (append) setPayments((prev) => [...prev, ...batch]);
      else setPayments(batch);
      setHasMore(!!d.hasMore);
      setNextOffset(typeof d.nextOffset === "number" ? d.nextOffset : offset + batch.length);
      if (d.stats) {
        if (typeof d.stats.totalAmountVnd === "number") setTotalAmountVnd(d.stats.totalAmountVnd);
        if (typeof d.stats.paymentCount === "number") setPaymentCount(d.stats.paymentCount);
      }
    },
    [dateFrom, dateTo],
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setPage(1);
    loadPage(0, false)
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [loadPage]);

  function onPaymentConfirmed(sessionId: string) {
    setPayments((prev) =>
      prev.map((p) =>
        p.sessionId === sessionId
          ? {
              ...p,
              status: "confirmed",
              canConfirm: false,
              confirmedAt: new Date().toISOString(),
            }
          : p,
      ),
    );
  }

  return (
    <ClientGuard allow={["admin"]}>
      <h1 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight">
        Danh sách thanh toán
      </h1>
      <PageBreadcrumb
        className="mt-2"
        items={[
          { href: "/admin", label: "Tổng quan" },
          { label: "Thanh toán" },
        ]}
      />

      <DateRangeFilterCard
        idPrefix="admin-pay"
        className="mt-6 rounded-2xl sm:mt-8 sm:rounded-tl-[2.5rem]"
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      >
        <PaymentTotalStatsSummary
          loading={loading}
          paymentCount={paymentCount}
          totalAmountVnd={totalAmountVnd}
        />
      </DateRangeFilterCard>

      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        ) : (
          <PaymentsListByDay rows={payments} onPaymentConfirmed={onPaymentConfirmed} emptyMessage="Không có dữ liệu." />
        )}
      </div>

      {!loading ? (
        <ListPaginationFooter
          itemCount={payments.length}
          hasMore={hasMore}
          loadingMore={loadingMore}
          page={page}
          onLoadMore={async () => {
            setLoadingMore(true);
            try {
              await loadPage(nextOffset, true);
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
            } finally {
              setLoadingMore(false);
            }
          }}
        />
      ) : null}
    </ClientGuard>
  );
}
