import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";

import { InstallPwaBanner } from "@/components/pwa/InstallPwaBanner";
import { APP_BRAND_NAME } from "@/lib/appBrand";
import "./globals.css";

const appName = APP_BRAND_NAME;

const heading = Fraunces({
  variable: "--font-heading",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800"],
});

const body = Nunito({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: appName,
    template: `%s · ${appName}`,
  },
  description:
    "Trạm sạc xe điện — quét QR, bắt đầu sạc, thanh toán sau phiên.",
  applicationName: appName,
  icons: {
    icon: [
      { url: "/brand/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/brand/logo-mark.svg", type: "image/svg+xml" },
    ],
    apple: "/brand/pwa-icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: appName,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#5d7052" },
    { media: "(prefers-color-scheme: dark)", color: "#5d7052" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${heading.variable} ${body.variable} min-h-dvh antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <InstallPwaBanner />
        <div className="flex min-h-0 min-h-dvh flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
