/** Tên hiển thị thương hiệu (client + server, build-time từ `NEXT_PUBLIC_APP_DISPLAY_NAME`). */
export const APP_BRAND_NAME =
  process.env.NEXT_PUBLIC_APP_DISPLAY_NAME?.trim() || "EV Green Station";
