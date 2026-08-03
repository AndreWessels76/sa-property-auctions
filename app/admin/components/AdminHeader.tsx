import Link from "next/link";
import { Home } from "lucide-react";

export default function AdminHeader() {
  return (
    <header className="flex h-20 items-center justify-between gap-4 border-b bg-white px-4 sm:px-8">
      <div className="min-w-0">
        <h2 className="truncate text-xl font-bold sm:text-2xl">
          Operations Centre
        </h2>
        <p className="truncate text-sm text-slate-500 sm:text-base">
          South Africa Property Auctions
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <Link
          href="/auctions"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-navy-900 transition hover:border-gold-400 hover:bg-gold-50 sm:px-4"
        >
          <Home className="h-4 w-4 text-gold-600" aria-hidden />
          <span className="hidden sm:inline">View Public Auctions</span>
          <span className="sm:hidden">Public Site</span>
        </Link>
        <div className="hidden rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-white md:block">
          System Healthy
        </div>
      </div>
    </header>
  );
}
