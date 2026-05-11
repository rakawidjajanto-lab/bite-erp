"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, Bell, Menu } from "lucide-react";
import { useSidebar } from "@/lib/sidebar-context";

export function Topbar({ title, subtitle }: { title?: string; subtitle?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const { setOpen } = useSidebar();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="h-14 sm:h-16 border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 bg-white shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger — only visible on mobile */}
        <button
          onClick={() => setOpen(true)}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">
            {title ?? "BITE ERP"}
          </h1>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition">
          <Bell size={18} />
        </button>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 px-2 sm:px-3 py-2 rounded-lg hover:bg-gray-100 transition"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
