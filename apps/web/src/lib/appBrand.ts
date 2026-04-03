/** Tên hiển thị thương hiệu (client + server, build-time từ `NEXT_PUBLIC_APP_DISPLAY_NAME`). */
export const APP_BRAND_NAME =
  process.env.NEXT_PUBLIC_APP_DISPLAY_NAME?.trim() || "EV Green Station";

/** Tên ngắn cho màn hình chính PWA / tile (≤ ~12 ký tự khuyến nghị). */
export const APP_BRAND_SHORT_NAME =
  process.env.NEXT_PUBLIC_APP_SHORT_NAME?.trim() || "EV Station";
