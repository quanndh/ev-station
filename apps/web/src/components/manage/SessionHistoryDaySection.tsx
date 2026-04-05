import Link from "next/link";

import { Card, CardTitle } from "@/components/ui/card";
import {
  DataTableShell,
  dataTableBodyRowClass,
  dataTableHeadRowClass,
  dataTableTd,
  dataTableTh,
} from "@/components/ui/data-table";
import { formatViDateTime, formatViDurationHm, formatViKwh } from "@/lib/formatVi";

import type { SessionHistoryListRow } from "@/components/manage/sessionHistoryShared";
import {
  formatSessionEndDisplay,
  formatSessionVnd,
  paymentStatusBadgeClass,
  paymentStatusLabel,
  sessionDurationMs,
  sessionStatusBadgeClass,
  sessionStatusLabel,
} from "@/components/manage/sessionHistoryShared";

export type SessionHistoryDayItem = SessionHistoryListRow & {
  station?: { id: string; name: string; slug: string };
};

function StatusCell({ sessionStatus, paymentStatus }: { sessionStatus: string; paymentStatus: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className={[
          "inline-flex w-fit rounded-md border px-2.5 py-1 text-xs font-bold",
          sessionStatusBadgeClass(sessionStatus),
        ].join(" ")}
      >
        {sessionStatusLabel(sessionStatus)}
      </span>
      <span
        className={[
          "inline-flex w-fit rounded-md border px-2.5 py-1 text-xs font-bold",
          paymentStatusBadgeClass(paymentStatus),
        ].join(" ")}
      >
        {paymentStatusLabel(paymentStatus)}
      </span>
    </div>
  );
}

function SessionTimeBlock({ s }: { s: SessionHistoryListRow }) {
  const dur = formatViDurationHm(sessionDurationMs(s));
  const end = formatSessionEndDisplay(s.startedAt, s.endedAt, s.status);
  return (
    <div className="grid gap-1.5 text-xs leading-snug">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Bắt đầu
        </span>
        <span className="font-medium tabular-nums text-foreground">{formatViDateTime(s.startedAt)}</span>
      </div>
      <div className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Kết thúc
        </span>
        <span className="font-medium tabular-nums text-foreground">{end}</span>
      </div>
      <div className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Thời lượng
        </span>
        <span className="text-foreground">{dur}</span>
      </div>
    </div>
  );
}

/** Thẻ mobile / tablet nhỏ: ưu tiên trạng thái rõ, ít nhét một dòng. */
function SessionHistoryMobileCard({
  s,
  station,
  stationDetailHref,
}: {
  s: SessionHistoryListRow;
  station?: { id: string; name: string; slug: string };
  stationDetailHref?: (stationId: string) => string;
}) {
  const userLine = [s.userName, s.userEmail].filter(Boolean).join(" · ") || "—";

  return (
    <Card padding="compact" className="rounded-2xl border-border/70">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/40 pb-3">
        <span
          className={[
            "inline-flex rounded-md border px-2.5 py-1 text-xs font-bold",
            sessionStatusBadgeClass(s.status),
          ].join(" ")}
        >
          {sessionStatusLabel(s.status)}
        </span>
        <span
          className={[
            "inline-flex rounded-md border px-2.5 py-1 text-xs font-bold",
            paymentStatusBadgeClass(s.paymentStatus),
          ].join(" ")}
        >
          {paymentStatusLabel(s.paymentStatus)}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {station && stationDetailHref ? (
          <CardTitle className="text-base font-bold leading-snug">
            <Link
              href={stationDetailHref(station.id)}
              className="text-foreground underline-offset-2 hover:underline"
            >
              {station.name}
            </Link>
          </CardTitle>
        ) : null}

        <SessionTimeBlock s={s} />

        {station ? (
          <p className="font-mono text-xs text-muted-foreground">{station.slug}</p>
        ) : null}

        <p className="text-sm text-muted-foreground">
          <span className="text-foreground">{userLine}</span>
        </p>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          <span>
            <span className="text-muted-foreground">kWh:</span>{" "}
            <span className="font-medium text-foreground">{formatViKwh(s.kWh)}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Tiền:</span>{" "}
            <span className="font-semibold text-foreground">{formatSessionVnd(s.amountVnd)}</span>
          </span>
        </div>

      </div>
    </Card>
  );
}

/**
 * Một nhóm theo ngày: &lt; md thẻ, ≥ md bảng (PC / tablet rộng; có overflow-x khi hẹp).
 */
export function SessionHistoryDaySection({
  dayLabel,
  items,
  showStationColumn,
  stationDetailHref,
}: {
  dayLabel: string;
  items: SessionHistoryDayItem[];
  showStationColumn: boolean;
  stationDetailHref?: (stationId: string) => string;
}) {
  return (
    <section className="space-y-2 sm:space-y-3">
      <h3 className="border-b border-border/50 pb-1 text-sm font-bold uppercase tracking-wide text-muted-foreground md:pb-2 md:text-base md:font-serif md:font-extrabold md:normal-case md:tracking-tight md:text-foreground">
        Ngày {dayLabel}
      </h3>

      <div className="flex flex-col gap-3 md:hidden">
        {items.map((s) => (
          <SessionHistoryMobileCard
            key={s.id}
            s={s}
            station={showStationColumn ? s.station : undefined}
            stationDetailHref={stationDetailHref}
          />
        ))}
      </div>

      <div className="hidden md:block">
        <DataTableShell minWidthClass={showStationColumn ? "min-w-[880px]" : "min-w-[640px]"}>
          <thead>
            <tr className={dataTableHeadRowClass}>
              {showStationColumn ? <th className={dataTableTh}>Trạm</th> : null}
              <th className={dataTableTh}>Thời gian</th>
              <th className={`${dataTableTh} min-w-[8rem]`}>Khách</th>
              <th className={`${dataTableTh} text-right`}>kWh</th>
              <th className={`${dataTableTh} text-right`}>Tiền</th>
              <th className={dataTableTh}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className={dataTableBodyRowClass}>
                {showStationColumn && s.station ? (
                  <td className={dataTableTd}>
                    {stationDetailHref ? (
                      <Link
                        href={stationDetailHref(s.station.id)}
                        className="font-semibold text-foreground underline-offset-2 hover:underline"
                      >
                        {s.station.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">{s.station.name}</span>
                    )}
                    <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {s.station.slug}
                    </div>
                  </td>
                ) : showStationColumn ? (
                  <td className={`${dataTableTd} text-muted-foreground`}>—</td>
                ) : null}
                <td className={`${dataTableTd} align-top`}>
                  <SessionTimeBlock s={s} />
                </td>
                <td className={`${dataTableTd} max-w-[14rem] break-words`}>
                  {[s.userName, s.userEmail].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className={`${dataTableTd} text-right font-medium tabular-nums`}>
                  {formatViKwh(s.kWh)}
                </td>
                <td className={`${dataTableTd} text-right font-semibold tabular-nums`}>
                  {formatSessionVnd(s.amountVnd)}
                </td>
                <td className={dataTableTd}>
                  <StatusCell sessionStatus={s.status} paymentStatus={s.paymentStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </DataTableShell>
      </div>
    </section>
  );
}
