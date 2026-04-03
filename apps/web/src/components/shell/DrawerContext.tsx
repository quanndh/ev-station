"use client";

import { createContext, useContext } from "react";

type DrawerCtx = {
  openDrawer: () => void;
  closeDrawer: () => void;
};

const Ctx = createContext<DrawerCtx | null>(null);

export function DrawerProvider({
  value,
  children,
}: {
  value: DrawerCtx;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDrawer() {
  return useContext(Ctx);
}

