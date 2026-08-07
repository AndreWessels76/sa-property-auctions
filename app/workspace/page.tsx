"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { PremiumGuard } from "@/app/components/subscription";
import { useAuth } from "@/app/components/auth/AuthProvider";
import LoadingGuard from "@/app/components/auth/LoadingGuard";
import { getFavourites } from "@/lib/favourites";

export default function InvestorWorkspacePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [favIds, setFavIds] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/workspace");
    }
  }, [loading, user, router]);

  useEffect(() => {
    setFavIds(getFavourites());
  }, []);

  if (!user && !loading) return null;

  return (
    <>
      <Header />
      <LoadingGuard loading={loading}>
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
            Premium
          </p>
          <h1 className="mt-1 text-3xl font-bold text-navy-900">
            Investor Workspace
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Private notes, saved properties, trackers and documents. Nothing here
            is public.
          </p>

          <PremiumGuard>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-navy-900">Saved properties</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Favourites synced on this device (watchlist).
                </p>
                {favIds.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-600">No saved properties yet.</p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {favIds.slice(0, 20).map((id) => (
                      <li key={id}>
                        <Link
                          href={`/properties/${id}`}
                          className="text-sm font-medium text-navy-900 underline"
                        >
                          Property {id.slice(0, 8)}…
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/favourites"
                  className="mt-4 inline-block text-xs font-semibold text-navy-900 underline"
                >
                  Open favourites
                </Link>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-navy-900">Workflow tools</h2>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  <li>
                    <Link href="/alerts" className="font-semibold underline">
                      Smart Auction Alerts
                    </Link>{" "}
                    — deterministic rule matching
                  </li>
                  <li>
                    <Link href="/calendar" className="font-semibold underline">
                      Auction Calendar
                    </Link>{" "}
                    — ICS export &amp; filters
                  </li>
                  <li>
                    Open any property detail to add private notes and track
                    registration / legal / settlement.
                  </li>
                </ul>
                <p className="mt-4 text-xs text-slate-500">
                  Document upload &amp; offline saved reports: storage paths ready;
                  apply migration `20260807120000_investor_experience_suite.sql`.
                </p>
              </section>
            </div>
          </PremiumGuard>
        </main>
      </LoadingGuard>
      <Footer />
    </>
  );
}
