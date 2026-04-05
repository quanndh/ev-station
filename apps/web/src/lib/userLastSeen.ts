import { prisma } from "@ev/db";

/** Tránh ghi DB quá dày khi client poll nhiều API. */
const MIN_INTERVAL_MS = 45_000;

/**
 * Cập nhật `User.updatedAt` khi có request API xác thực Bearer — dùng làm “online lần cuối” trên admin.
 * Gọi fire-and-forget; lỗi bỏ qua.
 */
export function touchUserLastSeenThrottled(userId: string): void {
  const cutoff = new Date(Date.now() - MIN_INTERVAL_MS);
  void prisma.user
    .updateMany({
      where: { id: userId, updatedAt: { lt: cutoff } },
      data: { updatedAt: new Date() },
    })
    .catch(() => {
      /* ignore */
    });
}
