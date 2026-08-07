"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { PremiumGuard } from "@/app/components/subscription";
import { useAuth } from "@/app/components/auth/AuthProvider";
import LoadingGuard from "@/app/components/auth/LoadingGuard";
import { createSmartAlertRuleAction } from "@/app/workspace/actions";

export default function SmartAlertsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [province, setProvince] = useState("");
  const [town, setTown] = useState("");
  const [agency, setAgency] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [days, setDays] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/alerts");
    }
  }, [loading, user, router]);

  if (!user && !loading) return null;

  return (
    <>
      <Header />
      <LoadingGuard loading={loading}>
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
            Premium
          </p>
          <h1 className="mt-1 text-3xl font-bold text-navy-900">
            Smart Auction Alerts
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Deterministic rules only. Email + Operations Centre channels. No
            speculative matching.
          </p>

          <PremiumGuard>
            <form
              className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const res = await createSmartAlertRuleAction({
                    name,
                    province: province || undefined,
                    town: town || undefined,
                    agency: agency || undefined,
                    propertyType: propertyType || undefined,
                    maxPrice: maxPrice ? Number(maxPrice) : undefined,
                    daysUntilAuction: days ? Number(days) : undefined,
                  });
                  setMessage(
                    res.ok
                      ? "Alert rule saved. Matching listings create alert history entries."
                      : res.error ?? "Failed",
                  );
                  if (res.ok) setName("");
                });
              }}
            >
              <label className="block text-xs">
                <span className="font-semibold text-slate-500">Rule name</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Farms in Limpopo under R5m"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs">
                  <span className="font-semibold text-slate-500">Province</span>
                  <input
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs">
                  <span className="font-semibold text-slate-500">Town</span>
                  <input
                    value={town}
                    onChange={(e) => setTown(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs">
                  <span className="font-semibold text-slate-500">Agency</span>
                  <input
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Bidders Choice"
                  />
                </label>
                <label className="block text-xs">
                  <span className="font-semibold text-slate-500">Property type</span>
                  <input
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Farm / Commercial / Vacant Land"
                  />
                </label>
                <label className="block text-xs">
                  <span className="font-semibold text-slate-500">
                    Max price (ZAR)
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs">
                  <span className="font-semibold text-slate-500">
                    Auction within days
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="14"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Create alert
              </button>
              {message ? (
                <p className="text-xs text-slate-600" role="status">
                  {message}
                </p>
              ) : null}
            </form>
            <p className="mt-4 text-xs text-slate-500">
              At least one criterion is required. Empty rules are rejected. Push
              notifications are reserved for a future release.
            </p>
          </PremiumGuard>
        </main>
      </LoadingGuard>
      <Footer />
    </>
  );
}
