import { BlobBackground } from "@/components/ui/blob-background";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import Link from "next/link";
import { SiteHeader } from "@/components/nav/SiteHeader";
import { QrCode } from "lucide-react";

export default function Home() {
  return (
    <BlobBackground className="flex-1">
      <SiteHeader />

      <main className="flex flex-1 flex-col py-16 sm:py-24">
        <Container className="max-w-4xl">
          <div className="rounded-[2.25rem] border border-[color:var(--border)]/60 bg-white/60 p-6 sm:p-10 shadow-[var(--shadow-float)]">
            <div className="inline-flex items-center rounded-full border border-[color:var(--border)]/60 bg-white/60 px-4 py-2 text-sm text-[color:var(--muted-foreground)] shadow-[var(--shadow-soft)]">
              Dành cho người sạc • Hướng dẫn nhanh
            </div>

            <h1 className="mt-5 font-serif text-4xl sm:text-5xl font-extrabold tracking-tight">
              Quét QR → Sạc → Thanh toán.
            </h1>

            <ol className="mt-5 grid gap-3 text-[color:var(--muted-foreground)]">
              <li>
                <strong className="text-[color:var(--foreground)]">1)</strong>{" "}
                Nhấn{" "}
                <strong className="text-[color:var(--foreground)]">
                  Quét QR
                </strong>{" "}
                và quét mã tại trạm.
              </li>
              <li>
                <strong className="text-[color:var(--foreground)]">2)</strong>{" "}
                Bắt đầu sạc và theo dõi{" "}
                <strong className="text-[color:var(--foreground)]">
                  thời gian
                </strong>
                ,{" "}
                <strong className="text-[color:var(--foreground)]">kWh</strong>,{" "}
                <strong className="text-[color:var(--foreground)]">
                  số tiền
                </strong>
                .
              </li>
              <li>
                <strong className="text-[color:var(--foreground)]">3)</strong>{" "}
                Dừng sạc, quét{" "}
                <strong className="text-[color:var(--foreground)]">
                  QR chuyển khoản
                </strong>
                , chờ xác nhận.
              </li>
            </ol>

            <div className="mt-8 flex justify-center text-center">
              <Link href="/scan">
                <div className="inline-flex flex-col items-center gap-3">
                  <span
                    className={[
                      "grid h-16 w-16 place-items-center rounded-full",
                      "bg-[color:var(--primary)] text-[color:var(--primary-foreground)]",
                      "shadow-[var(--shadow-soft)] transition-all duration-300",
                      "hover:scale-105 hover:shadow-[0_6px_24px_-4px_rgba(93,112,82,0.25)]",
                      "active:scale-95",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]",
                    ].join(" ")}
                  >
                    <QrCode size={28} />
                  </span>
                  <div className="text-sm font-semibold text-[color:var(--foreground)]">
                    Quét QR để vào trạm
                  </div>
                </div>
              </Link>
            </div>

            <p className="mt-5 text-sm text-[color:var(--muted-foreground)]">
              Lưu ý: hiện hỗ trợ 1 connector/trạm và thanh toán xác nhận thủ
              công.
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center gap-2 sm:mt-10">
            <Link href="/qr-test">
              <Button type="button" variant="outline" size="lg">
                Tạo QR và poster in trạm
              </Button>
            </Link>
            <p className="max-w-md text-center text-xs text-[color:var(--muted-foreground)]">
              Dành cho chủ trạm: tạo mã QR và ảnh poster để in, dán tại trụ sạc.
            </p>
          </div>
        </Container>
      </main>
    </BlobBackground>
  );
}
