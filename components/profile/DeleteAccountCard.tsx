"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteAccountCard() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete account");
      }
      router.replace("/?deleted=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <h2 className="text-lg font-bold text-red-800">Delete account</h2>
      <p className="mt-2 text-sm text-red-900/80">
        Permanently deletes your login and associated personal data we hold
        (profile, alerts, saved searches, watchlist). Cancel any Stripe
        subscription first if you want to stop billing. This cannot be undone.
      </p>
      <label className="mt-4 block text-sm font-medium text-red-900">
        Type DELETE to confirm
        <input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className="mt-1 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-navy-900"
          autoComplete="off"
        />
      </label>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      <button
        type="button"
        disabled={pending || confirmation !== "DELETE"}
        onClick={() => void onDelete()}
        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete account"}
      </button>
    </div>
  );
}
