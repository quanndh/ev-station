"use client";

import { useState } from "react";

import { SiteHeader } from "@/components/nav/SiteHeader";
import { AdminShell } from "@/components/admin/AdminShell";
import { DrawerProvider } from "@/components/shell/DrawerContext";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <DrawerProvider value={{ openDrawer: () => setOpen(true), closeDrawer: () => setOpen(false) }}>
      <SiteHeader />
      <main className="flex-1 py-8 sm:py-12">
        <AdminShell drawerOpen={open} setDrawerOpen={setOpen}>
          {children}
        </AdminShell>
      </main>
    </DrawerProvider>
  );
}

