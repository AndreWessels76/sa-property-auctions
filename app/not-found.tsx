import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-gold-600">
          404
        </p>
        <h1 className="mt-3 text-3xl font-bold text-navy-900">
          Page not found
        </h1>
        <p className="mt-4 text-slate-500">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-navy-900 px-6 py-3 font-semibold text-white transition hover:bg-navy-800"
        >
          Browse auctions
        </Link>
      </div>
    </main>
  );
}
