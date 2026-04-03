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
        description="Tổng quan hệ thống và doanh thu đã xác nhận."
        metrics={metrics}
        labels={{
          stationsTitle: "Tổng trạm",
          stationsMuted: "Đang quản lý trong hệ thống.",
          sessionsTitle: "Tổng lượt sạc",
          sessionsMuted: "Theo từng phiên sạc.",
          revenueTitle: "Doanh thu (đã xác nhận)",
          revenueMuted: "Chỉ thanh toán đã xác nhận.",
        }}
      />
    </ClientGuard>
  );
}
