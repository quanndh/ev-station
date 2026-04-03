import type { ReactNode } from "react";

import { Card, CardMuted, CardTitle } from "@/components/ui/card";

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
  description,
  metrics,
  error,
  labels,
  headerActions,
}: {
  title: string;
  description: string;
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
          <p className="mt-2 text-muted-foreground">{description}</p>
        </div>
        {headerActions ?? null}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <Card className="rounded-tl-[3rem]">
          <CardTitle>{labels.stationsTitle}</CardTitle>
          <div className="mt-3 text-3xl font-extrabold">
            {metrics ? metrics.stationsCount : "…"}
          </div>
          <CardMuted>{labels.stationsMuted}</CardMuted>
        </Card>
        <Card className="rounded-tr-[3rem]">
          <CardTitle>{labels.sessionsTitle}</CardTitle>
          <div className="mt-3 text-3xl font-extrabold">
            {metrics ? metrics.totalSessions : "…"}
          </div>
          <CardMuted>{labels.sessionsMuted}</CardMuted>
        </Card>
        <Card className="rounded-br-[3rem]">
          <CardTitle>{labels.revenueTitle}</CardTitle>
          <div className="mt-3 text-3xl font-extrabold">
            {metrics ? formatVnd(metrics.totalRevenueVndConfirmed) : "…"}
          </div>
          <CardMuted>{labels.revenueMuted}</CardMuted>
        </Card>
      </div>
    </>
  );
}
