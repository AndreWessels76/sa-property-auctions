"use client";

import { useAuth } from "@/app/components/auth/AuthProvider";

export default function ProfileCard() {
  const { user, profile } = useAuth();

  if (!profile) {
    return (
      <div className="rounded-2xl border bg-white p-8 shadow">
        <p className="text-slate-500">
          {user ? "Complete your profile." : "Please sign in."}
        </p>
      </div>
    );
  }

  const firstName = profile.first_name ?? "";
  const lastName = profile.last_name ?? "";
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    "Your profile";

  return (
    <div className="rounded-2xl border bg-white p-8 shadow">
      <h1 className="text-3xl font-bold">{fullName}</h1>

      {user?.email ? (
        <p className="mt-2 text-slate-500">{user.email}</p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            First name
          </p>
          <p className="mt-1 font-medium">{firstName || "—"}</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Last name
          </p>
          <p className="mt-1 font-medium">{lastName || "—"}</p>
        </div>
      </div>
    </div>
  );
}
