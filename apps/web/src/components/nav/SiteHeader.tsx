"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { LogoMark } from "@/components/brand/LogoMark";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { APP_BRAND_NAME } from "@/lib/appBrand";
import { clearToken, getTokenEmail, getTokenRole } from "@/lib/authClient";
import { useDrawer } from "@/components/shell/DrawerContext";
import { Menu } from "lucide-react";

export function SiteHeader() {
  const router = useRouter();
  const drawer = useDrawer();
  const role = getTokenRole();
  const email = getTokenEmail();
  const logoHref = role === "admin" ? "/admin" : role === "station_owner" ? "/owner" : "/";
  const isAuthed = !!role;
  const hidePartner = role === "admin" || role === "station_owner";

  function onLogout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <header className="sticky top-4 z-40">
      <Container>
        <div className="flex items-center justify-between gap-3 rounded-full border border-[color:var(--border)]/60 bg-white/70 px-3 py-2 shadow-[var(--shadow-soft)] backdrop-blur-md">
          <div className="flex items-center gap-2">
            {drawer ? (
              <button
                type="button"
                onClick={drawer.openDrawer}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)]/60 bg-white/60 text-[color:var(--foreground)] shadow-[var(--shadow-soft)] hover:bg-white active:scale-[0.99] lg:hidden"
                aria-label="Mở menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            ) : null}
          <Link
            href={logoHref}
            className="flex min-w-0 items-center gap-2 rounded-full px-2 py-1 sm:px-3 sm:py-2"
            aria-label={APP_BRAND_NAME}
          >
            <LogoMark className="h-8 w-8 sm:h-9 sm:w-9" />
            <span className="truncate font-serif text-base font-bold tracking-tight text-[color:var(--foreground)] sm:text-lg">
              {APP_BRAND_NAME}
            </span>
          </Link>
          </div>

          <nav className="flex items-center gap-2">
            {hidePartner ? null : (
              <a
                href="mailto:partner@evgreenstation.vn?subject=Tr%E1%BB%9F%20th%C3%A0nh%20%C4%91%E1%BB%91i%20t%C3%A1c%20EV%20Green%20Station"
                className="hidden sm:inline-flex"
              >
                <Button variant="ghost" size="sm">
                  Trở thành đối tác? Liên hệ ngay
                </Button>
              </a>
            )}
            {isAuthed ? (
              role === "user" ? (
                email ? (
                  <span
                    className="hidden max-w-[40vw] truncate px-2 text-sm font-semibold text-[color:var(--foreground)] sm:inline"
                    title={email}
                  >
                    {email}
                  </span>
                ) : null
              ) : (
                <div className="flex items-center gap-2 rounded-full border border-[color:var(--border)]/60 bg-white/60 px-2 py-1 shadow-[var(--shadow-soft)]">
                  <div className="hidden sm:block px-2 text-sm font-semibold text-[color:var(--foreground)]">
                    {email ?? "—"}
                  </div>
                  <Button size="sm" type="button" onClick={onLogout}>
                    Đăng xuất
                  </Button>
                </div>
              )
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Đăng nhập
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </Container>
    </header>
  );
}

