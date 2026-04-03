import { prisma } from "@ev/db";

const EMAIL = process.env.GUEST_CHARGING_USER_EMAIL ?? "guest-charging@local";

/** User gắn phiên sạc khi khách không đăng nhập (bắt buộc vì `userId` không nullable). */
export async function getGuestChargingUserId(): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.user.create({
    data: {
      email: EMAIL,
      name: "Khách sạc (QR)",
      role: "user",
      passwordHash: null,
    },
    select: { id: true },
  });
  return created.id;
}
