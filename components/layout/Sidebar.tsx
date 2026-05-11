"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  ShoppingBag,
  MapPin,
  Package,
  FlaskConical,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Transactions", href: "/dashboard/transactions", icon: ArrowLeftRight },
  { label: "Finance", href: "/dashboard/finance", icon: TrendingUp },
  { label: "Platforms", href: "/dashboard/platforms", icon: ShoppingBag },
  { label: "Venue", href: "/dashboard/venue", icon: MapPin },
  { label: "Inventory", href: "/dashboard/inventory", icon: Package },
  { label: "R&D", href: "/dashboard/rnd", icon: FlaskConical },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col shrink-0">
      <div className="p-6 border-b border-gray-800 flex items-center justify-between">
        <div>
          <span className="text-xl font-bold tracking-tight">BITE ERP</span>
          <p className="text-xs text-gray-400 mt-0.5">Protein Gelato</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-800 text-gray-400"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
        v0.1.0
      </div>
    </aside>
  );
}
