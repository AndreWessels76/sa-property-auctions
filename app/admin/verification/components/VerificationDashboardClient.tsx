"use client";

import { useEffect, useState, useTransition } from "react";

type Dashboard = {
  stats: {
    total: number;
    byState: Record<string, number>;
    needsVerification: number;
    missingImages: number;
    missingAddress: number;
    expired: number;
    averageOverallQuality: number | null;
  };
  queue: Array<{
    id: string;
    title: string;
    verificationLabel: string;
    verificationState: string;
    town: string | null;
    province: string | null;
    auctionDate: string | null;
    agency: string | null;
    sourceUrl: string | null;
    hasImages: boolean;
    overallQualityScore: number;
    issues: string[];
  }>;
  duplicateCandidates: Array<{
    aId: string;
    bId: string;
    confidenceScore: number;
    signals: string[];
  }>;
  sourceErrors: string[];
  importLogs: Array<{
    id: string;
    jobId: string | null;
    connectorId: string | null;
    stage: string;
    status: string;
    message: string | null;
    createdAt: string;
  }>;
  connectors: Array<{ id: string; name: string; version: string; enabled: boolean }>;
  acquisitionMetrics?: {
    importedToday: number;
    updatedToday: number;
    archivedToday: number;
    rejectedToday: number;
    verificationQueue: number;
    averageImportTimeMs: number | null;
    duplicateRate: number | null;
    successRate: number | null;
    sourceReliability: number | null;
  };
  checklists?: Record<
    string,
    {
      address: boolean;
      images: boolean;
      agency: boolean;
      auctionDate: boolean;
      propertyMetadata: boolean;
      source: boolean;
      qualityScore: number;
      readyToApprove: boolean;
      missing: string[];
    }
  >;
};

function isPubliclyVisible(state: string) {
  return state === "verified" || state === "sold";
}

export default function VerificationDashboardClient() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      try {
        setLoadError(null);
        const res = await fetch("/api/admin/verification");
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to load");
        }
        setData(json as Dashboard);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load");
      }
    });
  };

  useEffect(() => {
    load();
  }, []);

  const afterAction = (successMessage: string) => {
    setActionError(null);
    setActionSuccess(successMessage);
    load();
  };

  const setState = (propertyId: string, verificationState: string) => {
    startTransition(async () => {
      try {
        setActionError(null);
        setActionSuccess(null);
        const res = await fetch("/api/admin/verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId,
            verificationState,
            reason: `Admin set ${verificationState}`,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Update failed");
        afterAction(`State updated to ${verificationState}.`);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Update failed");
      }
    });
  };

  const runAction = (
    action: "approve" | "reject" | "merge",
    payload: Record<string, string>,
    successMessage: string,
  ) => {
    startTransition(async () => {
      try {
        setActionError(null);
        setActionSuccess(null);
        const res = await fetch("/api/admin/verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...payload }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Action failed");
        afterAction(successMessage);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Action failed");
      }
    });
  };

  if (loadError && !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
        {loadError}
        <button type="button" className="ml-3 underline" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return <p className="text-slate-600">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      {actionError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {actionError}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => setActionError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {actionSuccess ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {actionSuccess}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Needs verification", data.stats.needsVerification],
          ["Missing images", data.stats.missingImages],
          ["Missing address", data.stats.missingAddress],
          ["Expired", data.stats.expired],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {label}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Quality statistics (admin only)
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Average overall quality:{" "}
          {data.stats.averageOverallQuality != null
            ? `${data.stats.averageOverallQuality}/100`
            : "n/a"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {Object.entries(data.stats.byState).map(([k, v]) => (
            <span
              key={k}
              className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700"
            >
              {k}: {v}
            </span>
          ))}
        </div>
        {data.acquisitionMetrics ? (
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <p>Imported today: {data.acquisitionMetrics.importedToday}</p>
            <p>Updated today: {data.acquisitionMetrics.updatedToday}</p>
            <p>Rejected today: {data.acquisitionMetrics.rejectedToday}</p>
            <p>Queue: {data.acquisitionMetrics.verificationQueue}</p>
            <p>
              Success rate:{" "}
              {data.acquisitionMetrics.successRate != null
                ? `${data.acquisitionMetrics.successRate}%`
                : "n/a"}
            </p>
            <p>
              Duplicate rate:{" "}
              {data.acquisitionMetrics.duplicateRate != null
                ? `${data.acquisitionMetrics.duplicateRate}%`
                : "n/a"}
            </p>
          </div>
        ) : null}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Verification queue
        </h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Quality</th>
                <th className="px-3 py-2">Issues</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.queue.map((row) => {
                const checklist = data.checklists?.[row.id];
                const canApprove = checklist?.readyToApprove !== false;
                return (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{row.title}</div>
                      <div className="text-xs text-slate-500">
                        {[row.town, row.province].filter(Boolean).join(", ")}
                        {row.agency ? ` · ${row.agency}` : ""}
                        {!row.hasImages ? " · no images" : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2">{row.verificationLabel}</td>
                    <td className="px-3 py-2">{row.overallQualityScore}/100</td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {row.issues.join("; ") || "—"}
                      {checklist ? (
                        <div className="mt-1 text-[11px] text-slate-500">
                          Checklist:{" "}
                          {checklist.readyToApprove
                            ? "ready"
                            : `missing ${checklist.missing.join(", ") || "—"}`}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={pending}
                          title={
                            canApprove
                              ? "Approve as verified"
                              : `Checklist incomplete: ${checklist?.missing.join(", ") || "review before approving"}`
                          }
                          className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-900 disabled:opacity-50"
                          onClick={() =>
                            runAction(
                              "approve",
                              {
                                propertyId: row.id,
                                reason: "Admin approved verified listing",
                              },
                              "Listing approved and marked verified.",
                            )
                          }
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-900 disabled:opacity-50"
                          onClick={() =>
                            runAction(
                              "reject",
                              {
                                propertyId: row.id,
                                reason: "Admin rejected listing",
                              },
                              "Listing rejected.",
                            )
                          }
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-950 disabled:opacity-50"
                          onClick={() =>
                            setState(row.id, "pending_verification")
                          }
                        >
                          Pending
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-50"
                          onClick={() => setState(row.id, "archived")}
                        >
                          Archive
                        </button>
                        {isPubliclyVisible(row.verificationState) ? (
                          <a
                            href={`/properties/${row.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded bg-sky-100 px-2 py-1 text-xs font-medium text-sky-900"
                          >
                            Open Public Listing
                          </a>
                        ) : row.sourceUrl ? (
                          <a
                            href={row.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded bg-sky-100 px-2 py-1 text-xs font-medium text-sky-900"
                            title="Public page available after Approve"
                          >
                            Open Source Listing
                          </a>
                        ) : (
                          <span
                            className="rounded bg-slate-50 px-2 py-1 text-xs text-slate-400"
                            title="Approve to publish, or add a source URL"
                          >
                            No public link yet
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {data.queue.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={5}>
                    Queue empty for current sample.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Duplicate candidates
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.duplicateCandidates.map((d) => (
              <li key={`${d.aId}-${d.bId}`} className="rounded-lg bg-slate-50 p-2">
                <div>
                  {d.aId.slice(0, 8)}… ↔ {d.bId.slice(0, 8)}… —{" "}
                  {d.confidenceScore}% ({d.signals.join(", ") || "signals"})
                </div>
                <button
                  type="button"
                  disabled={pending}
                  className="mt-1 text-xs font-medium text-slate-700 underline disabled:opacity-50"
                  onClick={() =>
                    runAction(
                      "merge",
                      {
                        keepId: d.aId,
                        archiveId: d.bId,
                        reason: `Duplicate merge confidence ${d.confidenceScore}`,
                      },
                      "Duplicate merged (second listing archived).",
                    )
                  }
                >
                  Merge (keep first, archive second)
                </button>
              </li>
            ))}
            {data.duplicateCandidates.length === 0 ? (
              <li className="text-slate-500">No high-confidence duplicates.</li>
            ) : null}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Source errors</h2>
          <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-sm text-slate-700">
            {data.sourceErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
            {data.sourceErrors.length === 0 ? (
              <li className="text-slate-500">No source errors flagged.</li>
            ) : null}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Import logs</h2>
          <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-xs text-slate-600">
            {data.importLogs.map((l) => (
              <li key={l.id}>
                [{l.createdAt}] {l.connectorId || "—"} / {l.stage} / {l.status}
                {l.message ? ` — ${l.message}` : ""}
              </li>
            ))}
            {data.importLogs.length === 0 ? (
              <li>No pipeline events yet (apply migration + run imports).</li>
            ) : null}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Source connectors
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.connectors.map((c) => (
              <li
                key={c.id}
                className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"
              >
                <span>{c.name}</span>
                <span className="text-slate-500">v{c.version}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
