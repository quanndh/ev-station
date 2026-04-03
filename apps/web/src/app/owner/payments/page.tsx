"use client";

import { useEffect, useState } from "react";

import { PaymentsListByDay, type PaymentListRow } from "@/components/payments/PaymentsListByDay";
import { authedFetch } from "@/lib/authClient";
import { LIST_PAGE_SIZE } from "@/lib/apiPagination";
import { LoadMoreButton } from "@/components/ui/load-more-button";

export default function OwnerPaymentsPage() {
  const [payments, setPayments] = useState<PaymentListRow[]>([]);
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
    const r = await authedFetch(`/api/owner/payments?${qs}`);
    const d = await r.json();
    if (!r.ok) throw new Error(d.error ?? "Không tải được danh sách");
    const batch = (d.payments ?? []) as PaymentListRow[];
    if (append) setPayments((prev) => [...prev, ...batch]);
    else setPayments(batch);
    setHasMore(!!d.hasMore);
    setNextOffset(typeof d.nextOffset === "number" ? d.nextOffset : offset + batch.length);
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

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <>
      <h1 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight">
        Danh sách thanh toán
      </h1>
      <p className="mt-2 text-muted-foreground">
        Mọi thanh toán gắn với trạm của bạn (đã xác nhận và chưa). Nhóm theo ngày tạo bản ghi thanh toán.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {loading ? "Đang tải…" : `Đã tải ${payments.length} thanh toán${hasMore ? " · có thể tải thêm" : ""}.`}
      </p>

      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        ) : (
          <PaymentsListByDay
            rows={payments}
            onPaymentConfirmed={onPaymentConfirmed}
            emptyMessage="Chưa có thanh toán nào cho trạm của bạn."
            confirmHintPending="Xác nhận khi đã nhận đủ tiền."
          />
        )}
      </div>

      {!loading ? (
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
      ) : null}
    </>
  );
}
