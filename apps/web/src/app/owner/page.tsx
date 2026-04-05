"use client";

import { useEffect, useState } from "react";

import {
  DashboardOverview,
  type DashboardOverviewMetrics,
} from "@/components/dashboard/DashboardOverview";
import { authedFetch } from "@/lib/authClient";

export default function OwnerOverviewPage() {
  const [metrics, setMetrics] = useState<DashboardOverviewMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mRes = await authedFetch("/api/owner/metrics");
        const mData = await mRes.json().catch(() => ({}));
        if (!alive) return;
        if (!mRes.ok) throw new Error(mData.error ?? "Không tải được tổng quan");
        setMetrics({
          stationsCount: mData.stationsCount,
          totalSessions: mData.totalSessions,
          confirmedSessions: mData.confirmedSessions,
          totalRevenueVndConfirmed: mData.totalRevenueVndConfirmed ?? 0,
        });
      } catch (e: unknown) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <DashboardOverview
      title="Owner"
      breadcrumbItems={[{ href: "/", label: "Trang chủ" }, { label: "Tổng quan" }]}
      metrics={metrics}
      error={error}
      labels={{
        stationsTitle: "Trạm",
        stationsMuted: "",
        sessionsTitle: "Phiên sạc",
        sessionsMuted: "",
        revenueTitle: "Doanh thu (đã XN)",
        revenueMuted: "",
      }}
    />
  );
}
