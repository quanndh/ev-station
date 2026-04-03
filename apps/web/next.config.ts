import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Client chỉ đọc NEXT_PUBLIC_*; map từ DEMO_MODE nếu chưa set (một biến cho cả server + quét QR)
    NEXT_PUBLIC_DEMO_MODE:
      process.env.NEXT_PUBLIC_DEMO_MODE ?? process.env.DEMO_MODE ?? "",
    NEXT_PUBLIC_DEMO_STATION_SLUG:
      process.env.NEXT_PUBLIC_DEMO_STATION_SLUG ?? process.env.DEMO_STATION_SLUG ?? "",
  },
  // VPS/Docker: standalone. Vercel tự bundle serverless — không dùng standalone để tránh lỗi deploy.
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
};

export default nextConfig;
