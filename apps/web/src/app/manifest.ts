import type { MetadataRoute } from "next";

import { APP_BRAND_NAME, APP_BRAND_SHORT_NAME } from "@/lib/appBrand";

/** Manifest PWA — Next phục vụ tại `/manifest.webmanifest`. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_BRAND_NAME,
    short_name: APP_BRAND_SHORT_NAME,
    description:
      "Trạm sạc xe điện — quét QR, bắt đầu sạc, thanh toán sau phiên.",
    lang: "vi",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#fdfcf8",
    theme_color: "#5d7052",
    icons: [
      {
        src: "/brand/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/pwa-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/logo-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    categories: ["utilities", "lifestyle"],
  };
}
