"use client";

import { useMemo } from "react";

import { Card, CardTitle } from "@/components/ui/card";
import {
  DataTableShell,
  dataTableBodyRowClass,
  dataTableHeadRowClass,
  dataTableTd,
  dataTableTh,
} from "@/components/ui/data-table";
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
  cancelled: "Đã huỷ",
};

function methodLabel(m: string) {
  if (m === "qr_transfer") return "CK QR";
  return m;
}

const statusBadge = (confirmed: boolean) =>
  [
    "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold sm:text-xs",
    confirmed
      ? "border-emerald-700/40 bg-emerald-100 text-emerald-950"
      : "border-amber-700/40 bg-amber-100 text-amber-950",
  ].join(" ");

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
    <div className="space-y-5 sm:space-y-7">
      {byDay.map(({ dayKey, dayLabel, items }) => (
        <section key={dayKey} className="space-y-2 sm:space-y-3">
          <h3 className="border-b border-border/50 pb-1 text-sm font-bold uppercase tracking-wide text-muted-foreground md:pb-2 md:text-base md:font-serif md:font-extrabold md:normal-case md:tracking-tight md:text-foreground">
            Ngày {dayLabel}
          </h3>

          <ul className="flex flex-col gap-2 md:hidden">
            {items.map((p) => (
              <li key={p.paymentId}>
                <Card padding="compact" className="rounded-2xl sm:rounded-tl-[2rem]">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <CardTitle className="truncate text-base font-bold sm:text-lg">
                          {p.station.name}
                        </CardTitle>
                        <span className={statusBadge(p.status === "confirmed")}>
                          {paymentStatusVi[p.status] ?? p.status}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-muted-foreground sm:text-xs">
                        {p.station.slug}
                      </p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                        <span className="font-mono text-foreground/90">{p.reference}</span>
                        {" · "}
                        <span className="font-semibold text-foreground">{formatVnd(p.amountVnd)}</span>
                        {" · "}
                        {methodLabel(p.method)} · {formatViKwh(p.kWh)}
                      </p>
                      <p className="line-clamp-1 text-[11px] text-muted-foreground sm:line-clamp-none sm:text-xs">
                        {[p.userName, p.userEmail].filter(Boolean).join(" · ") || "—"} · Phiên{" "}
                        {formatViDateTime(p.sessionStartedAt)}
                      </p>
                      <p className="text-[10px] text-muted-foreground/90 sm:text-[11px]">
                        Tạo TT {formatViDateTime(p.createdAt)}
                        {p.confirmedAt ? ` · Xác nhận ${formatViDateTime(p.confirmedAt)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5 border-t border-border/40 pt-2 sm:border-t-0 sm:pt-0 sm:text-right">
                      {p.canConfirm ? (
                        <>
                          <ConfirmPaymentButton
                            sessionId={p.sessionId}
                            onConfirmed={() => onPaymentConfirmed(p.sessionId)}
                          />
                          {confirmHintPending ? (
                            <p className="text-[10px] text-muted-foreground sm:text-xs">
                              {confirmHintPending}
                            </p>
                          ) : null}
                        </>
                      ) : p.status === "pending" ? (
                        <p className="text-[10px] text-muted-foreground sm:text-xs">Chờ chủ trạm.</p>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTableShell minWidthClass="min-w-[980px]">
              <thead>
                <tr className={dataTableHeadRowClass}>
                  <th className={dataTableTh}>Trạm</th>
                  <th className={dataTableTh}>Trạng thái</th>
                  <th className={dataTableTh}>Mã CK · Tiền</th>
                  <th className={dataTableTh}>Khách</th>
                  <th className={`${dataTableTh} text-right`}>kWh</th>
                  <th className={dataTableTh}>Phiên sạc</th>
                  <th className={dataTableTh}>Tạo / Xác nhận</th>
                  <th className={dataTableTh}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.paymentId} className={dataTableBodyRowClass}>
                    <td className={dataTableTd}>
                      <div className="font-semibold text-foreground">{p.station.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{p.station.slug}</div>
                    </td>
                    <td className={dataTableTd}>
                      <span className={statusBadge(p.status === "confirmed")}>
                        {paymentStatusVi[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className={`${dataTableTd} font-mono text-xs`}>
                      <div className="text-foreground">{p.reference}</div>
                      <div className="mt-0.5 font-sans text-sm font-semibold tabular-nums text-foreground">
                        {formatVnd(p.amountVnd)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {methodLabel(p.method)}
                      </div>
                    </td>
                    <td className={`${dataTableTd} max-w-[12rem] break-words text-xs`}>
                      {[p.userName, p.userEmail].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className={`${dataTableTd} text-right tabular-nums`}>{formatViKwh(p.kWh)}</td>
                    <td className={`${dataTableTd} text-xs text-muted-foreground`}>
                      {formatViDateTime(p.sessionStartedAt)}
                    </td>
                    <td className={`${dataTableTd} text-xs text-muted-foreground`}>
                      <div>Tạo: {formatViDateTime(p.createdAt)}</div>
                      {p.confirmedAt ? (
                        <div className="mt-0.5">XN: {formatViDateTime(p.confirmedAt)}</div>
                      ) : (
                        <div className="mt-0.5 text-muted-foreground/70">—</div>
                      )}
                    </td>
                    <td className={dataTableTd}>
                      {p.canConfirm ? (
                        <div className="flex max-w-[14rem] flex-col gap-1.5">
                          <ConfirmPaymentButton
                            sessionId={p.sessionId}
                            size="xs"
                            variant="outline"
                            onConfirmed={() => onPaymentConfirmed(p.sessionId)}
                          />
                          {confirmHintPending ? (
                            <p className="text-[10px] text-muted-foreground">{confirmHintPending}</p>
                          ) : null}
                        </div>
                      ) : p.status === "pending" ? (
                        <p className="max-w-[12rem] text-xs text-muted-foreground">Chờ chủ trạm.</p>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTableShell>
          </div>
        </section>
      ))}
    </div>
  );
}
