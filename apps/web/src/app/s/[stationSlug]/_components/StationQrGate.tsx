"use client";

import Link from "next/link";

import { BlobBackground } from "@/components/ui/blob-background";
import { Button } from "@/components/ui/button";
import { Card, CardMuted, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { SiteHeader } from "@/components/nav/SiteHeader";

export type StationGateReason = "missing_token" | "invalid_token" | "wrong_station";

const copy: Record<StationGateReason, { title: string; body: string }> = {
  missing_token: {
    title: "Cần QR tại trạm",
    body: "Liên kết phải có mã xác thực trên URL (dạng ?t=…), thường có trong QR do admin/chủ trạm tạo. QR chỉ in /s/tên-trạm (không có ?t=) sẽ không mở được màn bắt đầu sạc. Bật DEMO_MODE hoặc CHARGING_SKIP_OCPP trong môi trường dev để thử không cần token.",
  },
  invalid_token: {
    title: "Liên kết hết hạn hoặc không hợp lệ",
    body: "Mã trên QR có thể đã hết hạn. Vui lòng quét lại QR mới tại trạm hoặc liên hệ chủ trạm.",
  },
  wrong_station: {
    title: "QR không khớp trạm này",
    body: "Mã bạn mở thuộc trạm khác. Hãy quét đúng QR của trạm hiện tại.",
  },
};

export default function StationQrGate({
  station,
  reason,
}: {
  station: { name: string; slug: string };
  reason: StationGateReason;
}) {
  const c = copy[reason];

  return (
    <BlobBackground>
      <SiteHeader />
      <main className="flex flex-1 flex-col py-8 sm:py-12">
        <Container className="max-w-4xl">
          <Card className="rounded-tl-[4rem]">
            <CardTitle>{station.name}</CardTitle>
            <CardMuted>
              Mã trạm: <span className="font-mono">{station.slug}</span>
            </CardMuted>

            <div className="mt-6 rounded-[var(--radius-card)] border border-[color:var(--border)]/60 bg-white/50 p-5">
              <p className="font-semibold text-[color:var(--foreground)]">{c.title}</p>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{c.body}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/scan">
                <Button size="lg" type="button">
                  Mở quét QR
                </Button>
              </Link>
              <Link href="/">
                <Button size="lg" variant="outline" type="button">
                  Về trang chủ
                </Button>
              </Link>
            </div>
          </Card>
        </Container>
      </main>
    </BlobBackground>
  );
}
