"use client";

import { useMemo } from "react";

import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmPaymentButton } from "@/components/payments/ConfirmPaymentButton";
import { groupRowsByViDay } from "@/lib/groupByViDay";
import { formatViDateTime, formatViKwh } from "@/lib/formatVi";

export type PaymentListRow = {
  paymentId: string;
  sessionId: string;
  reference: string;
  status: string;
  amountVnd: number;
  method: string;
  createdAt: string;
  confirmedAt: string | null;
  station: { id: string; name: string; slug: string };
  sessionStartedAt: string;
  kWh: string | null;
  userEmail: string | null;
  userName: string | null;
  canConfirm: boolean;
};

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

const paymentStatusVi: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
};

function methodLabel(m: string) {
  if (m === "qr_transfer") return "Chuyển khoản QR";
  return m;
}

export function PaymentsListByDay({
  rows,
  onPaymentConfirmed,
  emptyMessage,
  confirmHintPending,
}: {
  rows: PaymentListRow[];
  onPaymentConfirmed: (sessionId: string) => void;
  emptyMessage: string;
  confirmHintPending?: string;
}) {
  const byDay = useMemo(() => groupRowsByViDay(rows, (r) => r.createdAt), [rows]);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-10">
      {byDay.map(({ dayKey, dayLabel, items }) => (
        <section key={dayKey} className="space-y-4">
          <h3 className="border-b border-border/60 pb-2 font-serif text-lg font-extrabold tracking-tight text-foreground">
            Ngày {dayLabel}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((p) => (
              <Card key={p.paymentId} className="rounded-tl-[2.5rem]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">
                    {p.station.name}
                    <span className="mt-1 block text-sm font-normal text-muted-foreground font-mono">
                      {p.station.slug}
                    </span>
                  </CardTitle>
                  <span
                    className={[
                      "shrink-0 rounded-full border-2 px-3 py-1 text-sm font-bold tracking-tight",
                      p.status === "confirmed"
                        ? "border-emerald-700 bg-emerald-100 text-emerald-950"
                        : "border-amber-700 bg-amber-100 text-amber-950",
                    ].join(" ")}
                  >
                    {paymentStatusVi[p.status] ?? p.status}
                  </span>
                </div>
                <div className="mt-3 grid gap-1.5 text-sm text-muted-foreground">
                  <div>
                    Nội dung CK: <span className="font-mono text-foreground">{p.reference}</span>
                  </div>
                  <div>
                    Số tiền:{" "}
                    <span className="font-semibold text-foreground">{formatVnd(p.amountVnd)}</span>
                  </div>
                  <div>
                    Phương thức: <span className="text-foreground">{methodLabel(p.method)}</span>
                  </div>
                  <div>
                    Tạo thanh toán:{" "}
                    <span className="text-foreground">{formatViDateTime(p.createdAt)}</span>
                  </div>
                  {p.confirmedAt ? (
                    <div>
                      Xác nhận lúc:{" "}
                      <span className="text-foreground">{formatViDateTime(p.confirmedAt)}</span>
                    </div>
                  ) : null}
                  <div>
                    Phiên sạc bắt đầu:{" "}
                    <span className="text-foreground">{formatViDateTime(p.sessionStartedAt)}</span>
                  </div>
                  <div>
                    Điện năng (kWh):{" "}
                    <span className="text-foreground">{formatViKwh(p.kWh)}</span>
                  </div>
                  <div>
                    Người dùng:{" "}
                    <span className="text-foreground">
                      {[p.userName, p.userEmail].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  {p.canConfirm ? (
                    <>
                      <ConfirmPaymentButton
                        sessionId={p.sessionId}
                        onConfirmed={() => onPaymentConfirmed(p.sessionId)}
                      />
                      {confirmHintPending ? (
                        <p className="text-xs text-muted-foreground sm:text-sm">{confirmHintPending}</p>
                      ) : null}
                    </>
                  ) : p.status === "pending" ? (
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      Chờ chủ trạm xác nhận (trạm đã gán chủ).
                    </p>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
