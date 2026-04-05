"use client";

import { useEffect, useState } from "react";

import { ClientGuard } from "@/components/auth/ClientGuard";
import {
  DashboardOverview,
  type DashboardOverviewMetrics,
} from "@/components/dashboard/DashboardOverview";
import { authedFetch } from "@/lib/authClient";

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<DashboardOverviewMetrics | null>(null);

  useEffect(() => {
    let alive = true;
    authedFetch("/api/admin/metrics")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setMetrics({
          stationsCount: d.stationsCount,
          totalSessions: d.totalSessions,
          confirmedSessions: d.confirmedSessions,
          totalRevenueVndConfirmed: d.totalRevenueVndConfirmed ?? 0,
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <ClientGuard allow={["admin"]}>
      <DashboardOverview
        title="Admin"
        breadcrumbItems={[{ href: "/", label: "Trang chủ" }, { label: "Tổng quan" }]}
        metrics={metrics}
        labels={{
          stationsTitle: "Trạm",
          stationsMuted: "",
          sessionsTitle: "Phiên sạc",
          sessionsMuted: "",
          revenueTitle: "Doanh thu (đã XN)",
          revenueMuted: "",
        }}
      />
    </ClientGuard>
  );
}
