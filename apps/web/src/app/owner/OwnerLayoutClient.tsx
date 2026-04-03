"use client";

import { useState } from "react";

import { SiteHeader } from "@/components/nav/SiteHeader";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { ClientGuard } from "@/components/auth/ClientGuard";
import { DrawerProvider } from "@/components/shell/DrawerContext";

export function OwnerLayoutClient({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <ClientGuard allow={["station_owner"]}>
      <DrawerProvider value={{ openDrawer: () => setOpen(true), closeDrawer: () => setOpen(false) }}>
        <SiteHeader />
        <main className="flex-1 py-8 sm:py-12">
          <OwnerShell drawerOpen={open} setDrawerOpen={setOpen}>
            {children}
          </OwnerShell>
        </main>
      </DrawerProvider>
    </ClientGuard>
  );
}
