"use client";

import { useEffect, useState } from "react";

import { ClientGuard } from "@/components/auth/ClientGuard";
import { PaymentsListByDay, type PaymentListRow } from "@/components/payments/PaymentsListByDay";
import { authedFetch } from "@/lib/authClient";
import { LIST_PAGE_SIZE } from "@/lib/apiPagination";
import { LoadMoreButton } from "@/components/ui/load-more-button";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentListRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadPage(offset: number, append: boolean) {
    const qs = new URLSearchParams({
      limit: String(LIST_PAGE_SIZE),
      offset: String(offset),
    });
    const r = await authedFetch(`/api/admin/payments?${qs}`);
    const d = await r.json();
    const batch = (d.payments ?? []) as PaymentListRow[];
    if (append) setPayments((prev) => [...prev, ...batch]);
    else setPayments(batch);
    setHasMore(!!d.hasMore);
    setNextOffset(typeof d.nextOffset === "number" ? d.nextOffset : offset + batch.length);
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadPage(0, false)
      .catch(() => {})
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

  return (
    <ClientGuard allow={["admin"]}>
      <h1 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight">
        Danh sách thanh toán
      </h1>
      <p className="mt-2 text-muted-foreground">
        Tất cả bản ghi thanh toán (Payment) trong hệ thống, kể cả đã xác nhận và chưa. Nhóm theo ngày tạo
        thanh toán.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Chỉ có thể bấm xác nhận với giao dịch <strong className="text-foreground">chờ</strong> thuộc{" "}
        <strong className="text-foreground">trạm chưa gán chủ</strong>. Các trạm có chủ: chủ trạm xác nhận ở
        Owner.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Đã tải {payments.length} thanh toán
        {hasMore ? " · còn thêm khi bấm Tải thêm" : ""}.
      </p>

      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        ) : (
          <PaymentsListByDay
            rows={payments}
            onPaymentConfirmed={onPaymentConfirmed}
            emptyMessage="Chưa có thanh toán nào."
            confirmHintPending="Xác nhận khi đã đối soát chuyển khoản (chỉ trạm chưa gán chủ)."
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
            } finally {
              setLoadingMore(false);
            }
          }}
        />
      ) : null}
    </ClientGuard>
  );
}
