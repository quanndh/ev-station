"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AmberStatusPill } from "@/components/ui/amber-status-pill";
import { Card, CardTitle } from "@/components/ui/card";
import {
  DataTableShell,
  dataTableBodyRowClass,
  dataTableHeadRowClass,
  dataTableTd,
  dataTableTh,
} from "@/components/ui/data-table";
import { authedFetch } from "@/lib/authClient";
import { LIST_PAGE_SIZE } from "@/lib/apiPagination";
import { ListPaginationFooter } from "@/components/ui/list-pagination-footer";
import { formatViDateTime, formatViNumber } from "@/lib/formatVi";
import {
  PageBreadcrumb,
  type PageBreadcrumbItem,
} from "@/components/ui/page-breadcrumb";

type StationOwnerBrief = {
  id: string;
  email: string | null;
  name: string | null;
  disabledAt?: string | null;
} | null;

export type ManageStationListRow = {
  id: string;
  name: string;
  slug: string;
  ocppChargePointId: string;
  defaultPriceVndPerKwh: number | null;
  lastSeenAt: string | null;
  ownerId: string | null;
  owner: StationOwnerBrief;
  disabledAt?: string | null;
  disabledBy?: "owner" | "admin" | null;
  /** Chỉ từ API manage; có thể suy ra từ disabledAt + owner.disabledAt */
  chargingBlocked?: boolean;
};

export function stationRowChargingBlocked(s: ManageStationListRow): boolean {
  if (s.chargingBlocked === true) return true;
  if (s.disabledAt) return true;
  if (s.owner?.disabledAt) return true;
  return false;
}

export function stationChargingBlockedLabel(s: ManageStationListRow): string {
  if (!stationRowChargingBlocked(s)) return "";
  if (s.owner?.disabledAt) return "Chủ trạm bị khóa";
  if (s.disabledBy === "admin") return "Admin tạm ngưng sạc";
  if (s.disabledBy === "owner") return "Chủ trạm tạm ngưng sạc";
  return "Tạm ngưng sạc";
}

function StationChargingBlockedBadge({ station: s }: { station: ManageStationListRow }) {
  if (!stationRowChargingBlocked(s)) return null;
  return <AmberStatusPill>{stationChargingBlockedLabel(s)}</AmberStatusPill>;
}

/** Thẻ trạm: bấm vào phần nội dung để mở chi tiết. Có thể thêm `footer` (vd. QR) ngoài vùng link — dùng chung admin & owner. */
export function ManageStationCard({
  station: s,
  detailHref,
  showOwner,
  footer,
  cardClassName = "",
}: {
  station: ManageStationListRow;
  detailHref: string;
  showOwner: boolean;
  footer?: ReactNode;
  cardClassName?: string;
}) {
  const body = (
    <>
      <div className="flex flex-col gap-1">
        <CardTitle className="text-lg sm:text-xl">{s.name}</CardTitle>
        <StationChargingBlockedBadge station={s} />
      </div>
      <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 sm:gap-x-4 sm:gap-y-1 sm:text-sm">
        <div>
          Mã: <span className="font-mono text-foreground">{s.slug}</span>
        </div>
        {showOwner ? (
          <div className="sm:col-span-2">
            Chủ:{" "}
            <span className="text-foreground">
              {s.owner
                ? [s.owner.email, s.owner.name].filter(Boolean).join(" · ") || s.owner.id
                : "— (admin · dừng phiên)"}
            </span>
          </div>
        ) : null}
        <div>
          OCPP: <span className="font-mono text-foreground">{s.ocppChargePointId}</span>
        </div>
        <div>
          Giá:{" "}
          <span className="font-semibold text-foreground">
            {s.defaultPriceVndPerKwh != null ? formatViNumber(s.defaultPriceVndPerKwh) : "—"}
          </span>
          {s.defaultPriceVndPerKwh != null ? " đ/kWh" : ""}
        </div>
        <div className="sm:col-span-2">
          Online: <span className="text-foreground">{formatViDateTime(s.lastSeenAt)}</span>
        </div>
      </div>
    </>
  );

  const cardBase = ["rounded-2xl sm:rounded-tl-[2.5rem]", cardClassName].filter(Boolean).join(" ");

  if (footer != null) {
    return (
      <Card
        padding="compact"
        className={`flex flex-col overflow-hidden !p-0 sm:!p-0 ${cardBase}`}
      >
        <Link
          href={detailHref}
          className="block cursor-pointer p-3.5 transition hover:opacity-95 sm:p-4"
        >
          {body}
        </Link>
        <div className="border-t border-[color:var(--border)]/60 px-3.5 py-3 sm:px-4">{footer}</div>
      </Card>
    );
  }

  return (
    <Link href={detailHref} className="block transition hover:opacity-95">
      <Card padding="compact" className={`h-full cursor-pointer ${cardBase}`}>
        {body}
      </Card>
    </Link>
  );
}

/** Bảng trạm — từ `md` (tablet/PC); `actionsColumn` cho admin (QR). */
export function ManageStationsTable({
  stations,
  getDetailHref,
  showOwner,
  actionsColumn,
}: {
  stations: ManageStationListRow[];
  getDetailHref: (stationId: string) => string;
  showOwner: boolean;
  actionsColumn?: (s: ManageStationListRow) => ReactNode;
}) {
  const router = useRouter();
  const minW = showOwner || actionsColumn ? "min-w-[920px]" : "min-w-[640px]";
  return (
    <DataTableShell minWidthClass={minW}>
      <thead>
        <tr className={dataTableHeadRowClass}>
          <th className={dataTableTh}>Trạm</th>
          <th className={dataTableTh}>Mã</th>
          {showOwner ? <th className={dataTableTh}>Chủ trạm</th> : null}
          <th className={dataTableTh}>OCPP</th>
          <th className={dataTableTh}>Giá</th>
          <th className={dataTableTh}>Online</th>
          {actionsColumn ? <th className={dataTableTh}>Thao tác</th> : null}
        </tr>
      </thead>
      <tbody>
        {stations.map((s) => (
          <tr
            key={s.id}
            className={[
              dataTableBodyRowClass,
              "cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--primary)]/35",
            ].join(" ")}
            tabIndex={0}
            role="link"
            aria-label={`Mở chi tiết trạm ${s.name}`}
            onClick={() => router.push(getDetailHref(s.id))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(getDetailHref(s.id));
              }
            }}
          >
            <td className={dataTableTd}>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-foreground">{s.name}</span>
                <StationChargingBlockedBadge station={s} />
              </div>
            </td>
            <td className={dataTableTd}>
              <span className="font-mono text-xs">{s.slug}</span>
            </td>
            {showOwner ? (
              <td className={`${dataTableTd} max-w-[14rem] break-words text-xs`}>
                {s.owner
                  ? [s.owner.email, s.owner.name].filter(Boolean).join(" · ") || s.owner.id
                  : "—"}
              </td>
            ) : null}
            <td className={dataTableTd}>
              <span className="font-mono text-xs">{s.ocppChargePointId}</span>
            </td>
            <td className={`${dataTableTd} text-xs tabular-nums`}>
              {s.defaultPriceVndPerKwh != null ? (
                <>
                  {formatViNumber(s.defaultPriceVndPerKwh)}
                  <span className="text-muted-foreground"> đ/kWh</span>
                </>
              ) : (
                "—"
              )}
            </td>
            <td className={`${dataTableTd} text-xs text-muted-foreground`}>
              {formatViDateTime(s.lastSeenAt)}
            </td>
            {actionsColumn ? (
              <td
                className={`${dataTableTd} min-w-[10rem]`}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {actionsColumn(s)}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </DataTableShell>
  );
}

export function ManageStationListPage({
  rootPath,
  title,
  breadcrumbItems,
  showOwner,
}: {
  rootPath: string;
  title: string;
  breadcrumbItems: PageBreadcrumbItem[];
  /** Admin: hiện chủ trạm trên thẻ. */
  showOwner: boolean;
}) {
  const [stations, setStations] = useState<ManageStationListRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPage(offset: number, append: boolean) {
    const qs = new URLSearchParams({
      limit: String(LIST_PAGE_SIZE),
      offset: String(offset),
    });
    const res = await authedFetch(`/api/manage/stations?${qs}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Không tải được danh sách trạm");
    const batch = (data.stations ?? []) as ManageStationListRow[];
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
      <h1 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight">{title}</h1>
      <PageBreadcrumb className="mt-2" items={breadcrumbItems} />

      {stations.length > 0 ? (
        <>
          <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 md:hidden">
            {stations.map((s) => (
              <ManageStationCard
                key={s.id}
                station={s}
                detailHref={`${rootPath.replace(/\/$/, "")}/${s.id}`}
                showOwner={showOwner}
              />
            ))}
          </div>
          <div className="mt-6 hidden md:mt-8 md:block">
            <ManageStationsTable
              stations={stations}
              getDetailHref={(id) => `${rootPath.replace(/\/$/, "")}/${id}`}
              showOwner={showOwner}
            />
          </div>
        </>
      ) : (
        <div className="mt-6 text-muted-foreground">
          {showOwner ? "Chưa có trạm nào." : "Bạn chưa có trạm nào."}
        </div>
      )}

      <ListPaginationFooter
        itemCount={stations.length}
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
    </>
  );
}
