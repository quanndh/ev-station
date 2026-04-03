import { prisma } from "@ev/db";

const DEVICE_ID_RE = /^[a-zA-Z0-9_-]{16,128}$/;

/** Chuẩn hóa / validate id thiết bị do client gửi (vd. `crypto.randomUUID()`). */
export function validateChargingDeviceId(raw: string): string | null {
  const s = raw.trim();
  if (!DEVICE_ID_RE.test(s)) return null;
  return s;
}

export async function getOrCreateChargingUserForDevice(deviceId: string): Promise<string> {
  const validated = validateChargingDeviceId(deviceId);
  if (!validated) throw new Error("Invalid charging device id");

  const existing = await prisma.user.findUnique({
    where: { chargingDeviceId: validated },
    select: { id: true },
  });
  if (existing) return existing.id;

  try {
    const created = await prisma.user.create({
      data: {
        chargingDeviceId: validated,
        name: "Khách sạc (thiết bị)",
        role: "user",
      },
      select: { id: true },
    });
    return created.id;
  } catch {
    const again = await prisma.user.findUnique({
      where: { chargingDeviceId: validated },
      select: { id: true },
    });
    if (again) return again.id;
    throw new Error("Could not create device charging user");
  }
}
