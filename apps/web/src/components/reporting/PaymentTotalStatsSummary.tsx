import { formatViNumber } from "@/lib/formatVi";

export function PaymentTotalStatsSummary({
  paymentCount,
  totalAmountVnd,
  loading,
}: {
  paymentCount: number | null;
  totalAmountVnd: number | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="mt-4 border-t border-border/60 pt-4">
        <p className="text-xs text-muted-foreground">Đang tải…</p>
      </div>
    );
  }
  if (paymentCount === null || totalAmountVnd === null) {
    return null;
  }
  return (
    <div className="mt-4 grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2">
      <div>
        <p className="text-xs text-muted-foreground">Số giao dịch</p>
        <p className="mt-0.5 font-serif text-xl font-extrabold text-foreground">
          {formatViNumber(paymentCount)}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Tổng tiền</p>
        <p className="mt-0.5 font-serif text-xl font-extrabold text-foreground">
          {formatViNumber(totalAmountVnd)} đ
        </p>
      </div>
    </div>
  );
}
