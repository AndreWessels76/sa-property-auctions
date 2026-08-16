"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

type FeedStatus = {
  contract: string;
  partner: string;
  resultsFeed: string;
  authorisation: string;
  ingestion: string;
  productionWrite?: string;
  activePartnerForResults: boolean;
  verifiedResultsReceived: number;
  verifiedSalePrices: number;
  lastSuccessfulIngestion: string | null;
  nextAction: string;
  contractVersion?: string;
  liveCoverage?: {
    verifiedSold: number | null;
    verifiedSalePrices: number | null;
    comparableReady: number | null;
    marketReadyTowns: number | null;
    catalogueLeaks: number | null;
    outcomeMissing: number | null;
  };
};

function row(label: string, value: string | number | null | undefined) {
  return (
    <div className="flex justify-between gap-4 border-b border-black/5 py-2 text-sm">
      <span className="text-black/60">{label}</span>
      <span className="font-medium text-right">{value ?? "NONE"}</span>
    </div>
  );
}

export default function BiddersChoiceResultsFeedPanel() {
  const [status, setStatus] = useState<FeedStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/acquisition/partner-results", {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          status?: FeedStatus;
        };
        if (!json.ok || !json.status) {
          setError(json.error ?? "Failed to load results-feed status");
          return;
        }
        setError(null);
        setStatus(json.status);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed");
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="mt-8 rounded-lg border border-black/10 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Bidders Choice Results Feed</h2>
          <p className="mt-1 text-sm text-black/60">
            Authorised post-auction / results contract — not public listing scrape.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={pending}
          className="rounded border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : status ? (
        <div className="max-w-xl">
          {row("Status", status.contract === "READY" ? "CONTRACT READY" : status.contract)}
          {row(
            "Active Partner",
            status.activePartnerForResults ? "YES" : "NO",
          )}
          {row(
            "Results Feed",
            status.resultsFeed === "CONNECTED" ? "CONNECTED" : "NOT CONNECTED",
          )}
          {row("Authorisation", status.authorisation)}
          {row("Ingestion", status.ingestion)}
          {row(
            "Production Write",
            status.productionWrite === "ALLOWED" ? "ALLOWED" : "BLOCKED",
          )}
          {row("Verified Results Received", status.verifiedResultsReceived)}
          {row("Verified Sale Prices", status.verifiedSalePrices)}
          {row(
            "Last Successful Ingestion",
            status.lastSuccessfulIngestion ?? "NONE",
          )}
          {row(
            "Catalogue Leaks",
            status.liveCoverage?.catalogueLeaks ?? "DATA UNAVAILABLE",
          )}
          <p className="mt-4 text-sm text-black/80">
            <span className="font-medium">Next Action:</span> {status.nextAction}
          </p>
          {status.contractVersion ? (
            <p className="mt-2 text-xs text-black/45">{status.contractVersion}</p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-black/50">Loading…</p>
      )}
    </section>
  );
}
