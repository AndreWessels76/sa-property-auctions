"use client";

import { useState, useTransition } from "react";
import { PremiumGuard } from "@/app/components/subscription";
import { useAuth } from "@/app/components/auth/AuthProvider";
import {
  createWorkspaceNoteAction,
  upsertWorkspaceTrackerAction,
} from "@/app/workspace/actions";

type Props = {
  propertyId: string;
};

function WorkspaceInner({ propertyId }: Props) {
  const { user } = useAuth();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!user) {
    return (
      <p className="text-sm text-slate-600">
        Sign in with a premium account to use Investor Workspace.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="ws-note" className="text-xs font-semibold uppercase text-slate-400">
          Private note
        </label>
        <textarea
          id="ws-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Inspection notes, legal follow-ups… private to you only"
        />
        <button
          type="button"
          disabled={pending || !note.trim()}
          className="mt-2 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          onClick={() => {
            startTransition(async () => {
              const res = await createWorkspaceNoteAction({
                propertyId,
                body: note.trim(),
              });
              setMessage(res.ok ? "Note saved privately." : res.error ?? "Failed");
              if (res.ok) setNote("");
            });
          }}
        >
          Save note
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {(
          [
            ["registrationStatus", "Track registration"],
            ["legalStatus", "Track legal"],
            ["settlementStatus", "Track settlement"],
          ] as const
        ).map(([field, label]) => (
          <button
            key={field}
            type="button"
            disabled={pending}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-navy-900/30"
            onClick={() => {
              startTransition(async () => {
                const res = await upsertWorkspaceTrackerAction({
                  propertyId,
                  [field]: "in_progress",
                });
                setMessage(
                  res.ok ? `${label} updated.` : res.error ?? "Failed",
                );
              });
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {message ? (
        <p className="text-xs text-slate-600" role="status">
          {message}
        </p>
      ) : null}

      <p className="text-[11px] text-slate-400">
        Workspace data is private. Never published to the catalogue.
      </p>
    </div>
  );
}

export default function InvestorWorkspacePanel({ propertyId }: Props) {
  return (
    <section
      aria-labelledby="investor-workspace-heading"
      className="rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm sm:p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
        Premium
      </p>
      <h2
        id="investor-workspace-heading"
        className="mt-1 text-xl font-bold text-navy-900"
      >
        Investor Workspace
      </h2>
      <p className="mt-2 mb-4 text-sm text-slate-600">
        Save notes and track registration, legal and settlement progress privately.
      </p>
      <PremiumGuard
        fallback={
          <p className="text-sm text-slate-600">
            Premium feature — upgrade to unlock private notes, document storage and
            deal trackers.
          </p>
        }
      >
        <WorkspaceInner propertyId={propertyId} />
      </PremiumGuard>
    </section>
  );
}
