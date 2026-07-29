"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Activity,
  Database,
  Image,
  Home,
  BarChart3,
  FileText,
  Settings,
  Globe,
} from "lucide-react";

const menu = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "Operations",
    href: "/admin/operations",
    icon: Activity,
  },
  {
    name: "Imports",
    href: "/admin/imports",
    icon: Database,
  },
  {
    name: "Sources",
    href: "/admin/sources",
    icon: Globe,
  },
  {
    name: "Properties",
    href: "/admin/properties",
    icon: Home,
  },
  {
    name: "Images",
    href: "/admin/images",
    icon: Image,
  },
  {
    name: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    name: "Logs",
    href: "/admin/logs",
    icon: FileText,
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 bg-slate-900 text-white">
      <div className="border-b border-slate-700 p-6">
        <h1 className="text-2xl font-bold">SA Property</h1>
        <p className="text-sm text-slate-400">Operations Centre</p>
      </div>

      <nav className="space-y-1 p-4">
        {menu.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

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
              <Icon size={20} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
