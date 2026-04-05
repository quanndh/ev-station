import type { ReactNode } from "react";

import { Card, CardMuted, CardTitle } from "@/components/ui/card";
import {
  PageBreadcrumb,
  type PageBreadcrumbItem,
} from "@/components/ui/page-breadcrumb";

export type DashboardOverviewMetrics = {
  stationsCount: number;
  totalSessions: number;
  confirmedSessions: number;
  totalRevenueVndConfirmed: number;
};

export type DashboardOverviewLabels = {
  stationsTitle: string;
  stationsMuted: string;
  sessionsTitle: string;
  sessionsMuted: string;
  revenueTitle: string;
  revenueMuted: string;
};

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function DashboardOverview({
  title,
  breadcrumbItems,
  metrics,
  error,
  labels,
  headerActions,
}: {
  title: string;
  breadcrumbItems: PageBreadcrumbItem[];
  metrics: DashboardOverviewMetrics | null;
  error?: string | null;
  labels: DashboardOverviewLabels;
  headerActions?: ReactNode;
}) {
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <>
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight">
            {title}
          </h1>
          <PageBreadcrumb items={breadcrumbItems} />
        </div>
        {headerActions ?? null}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <Card className="rounded-tl-[3rem]">
          <CardTitle>{labels.stationsTitle}</CardTitle>
          <div className="mt-3 text-3xl font-extrabold">
            {metrics ? metrics.stationsCount : "…"}
          </div>
          {labels.stationsMuted ? <CardMuted>{labels.stationsMuted}</CardMuted> : null}
        </Card>
        <Card className="rounded-tr-[3rem]">
          <CardTitle>{labels.sessionsTitle}</CardTitle>
          <div className="mt-3 text-3xl font-extrabold">
            {metrics ? metrics.totalSessions : "…"}
          </div>
          {labels.sessionsMuted ? <CardMuted>{labels.sessionsMuted}</CardMuted> : null}
        </Card>
        <Card className="rounded-br-[3rem]">
          <CardTitle>{labels.revenueTitle}</CardTitle>
          <div className="mt-3 text-3xl font-extrabold">
            {metrics ? formatVnd(metrics.totalRevenueVndConfirmed) : "…"}
          </div>
          {labels.revenueMuted ? <CardMuted>{labels.revenueMuted}</CardMuted> : null}
        </Card>
      </div>
    </>
  );
}
