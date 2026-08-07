"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Activity,
  Database,
  ListOrdered,
  BarChart3,
  ShieldCheck,
  Home,
  Network,
} from "lucide-react";

/** Only ship links to pages that exist for closed beta. */
const menu = [
  {
    name: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: BarChart3,
  },
  {
    name: "Operations",
    href: "/admin/operations",
    icon: Activity,
  },
  {
    name: "Acquisition",
    href: "/admin/acquisition",
    icon: Network,
  },
  {
    name: "Imports",
    href: "/admin/imports",
    icon: Database,
  },
  {
    name: "Verification",
    href: "/admin/verification",
    icon: ShieldCheck,
  },
  {
    name: "Queue",
    href: "/admin/queue",
    icon: ListOrdered,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-screen w-72 shrink-0 flex-col self-stretch bg-slate-900 text-white">
      <div className="border-b border-slate-700 p-6">
        <h1 className="text-2xl font-bold">SA Property</h1>
        <p className="text-sm text-slate-400">Operations Centre</p>
      </div>

      <nav className="flex flex-1 flex-col space-y-1 p-4" aria-label="Admin">
        {menu.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                active
                  ? "bg-gold-500 text-slate-900 font-semibold"
                  : "hover:bg-slate-800"
              }`}
            >
              <Icon size={20} aria-hidden />
              {item.name}
            </Link>
          );
        })}

        {/* Permanent primary exit to public catalogue — always after admin links */}
        <div className="mt-4 border-t border-slate-700 pt-4">
          <Link
            href="/auctions"
            className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold text-gold-400 transition hover:bg-slate-800 hover:text-gold-300"
            data-testid="admin-view-public-auctions"
          >
            <Home size={20} aria-hidden />
            View Public Auctions
          </Link>
        </div>
      </nav>
    </aside>
  );
}
