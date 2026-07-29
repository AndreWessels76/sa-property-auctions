"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import SavedSearchWidget from "@/app/components/dashboard/SavedSearchWidget";
import type { CurrentProfile } from "@/lib/auth/profileTypes";
import { getUserSavedSearches } from "@/app/dashboard/save-searches/actions";
import type { SavedSearchDTO } from "@/lib/dto/SavedSearchDTO";
import type { Role } from "@/lib/permissions/roles";
import type { SubscriptionStatus } from "@/lib/subscription";

type DashboardProps = {
  user: User;
  profile: CurrentProfile | null;
  role: Role;
  subscription: SubscriptionStatus | null;
};

export default function Dashboard({
  user,
  profile,
  role,
  subscription,
}: DashboardProps) {
  const [savedSearches, setSavedSearches] = useState<SavedSearchDTO[]>([]);

  const email = user.email ?? "";
  const name =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    (user.user_metadata?.first_name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    email.split("@")[0] ||
    "there";

  useEffect(() => {
    async function loadSavedSearches() {
      try {
        const searches = await getUserSavedSearches(user.id);
        setSavedSearches(searches);
      } catch {
        setSavedSearches([]);
      }
    }

    void loadSavedSearches();
  }, [user.id]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <h1 className="text-4xl font-bold text-navy-900">Welcome, {name}</h1>

      {email ? (
        <p className="mt-4 text-xl text-slate-600">{email}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
        <span className="rounded-lg bg-slate-100 px-3 py-1 capitalize">
          Role: {role}
        </span>
        <span className="rounded-lg bg-slate-100 px-3 py-1">
          Subscription: {subscription}
        </span>
      </div>

      <div className="mt-10">
        <SavedSearchWidget searches={savedSearches} />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/profile"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-navy-900/20"
        >
          <h2 className="font-semibold text-navy-900">Profile</h2>
          <p className="mt-2 text-sm text-slate-500">
            Update your name and account details
          </p>
        </Link>

        <Link
          href="/heatmaps"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-navy-900/20"
        >
          <h2 className="font-semibold text-navy-900">Heat Maps</h2>
          <p className="mt-2 text-sm text-slate-500">
            Premium market opportunity view
          </p>
        </Link>

        <Link
          href="/favourites"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-navy-900/20"
        >
          <h2 className="font-semibold text-navy-900">Favourites</h2>
          <p className="mt-2 text-sm text-slate-500">
            Jump back to saved properties
          </p>
        </Link>

        <Link
          href="/#featured"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-navy-900/20"
        >
          <h2 className="font-semibold text-navy-900">Browse auctions</h2>
          <p className="mt-2 text-sm text-slate-500">
            Explore the latest listings
          </p>
        </Link>
      </div>
    </main>
  );
}
