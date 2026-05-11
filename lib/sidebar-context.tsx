"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type SidebarCtx = { open: boolean; setOpen: (v: boolean) => void };

const SidebarContext = createContext<SidebarCtx>({ open: false, setOpen: () => {} });

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
