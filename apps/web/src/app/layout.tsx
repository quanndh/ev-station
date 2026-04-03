import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";

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
    icon: "/brand/logo-mark.svg",
    apple: "/brand/logo-mark.svg",
  },
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
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
