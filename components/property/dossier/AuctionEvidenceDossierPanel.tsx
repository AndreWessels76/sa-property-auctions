"use client";

import { useState } from "react";
import type {
  AuctionEvidenceDossier,
  AuctionTruthStatus,
  DossierClaim,
} from "@/lib/property/auctionEvidenceDossier";

function truthTone(status: AuctionTruthStatus): string {
  switch (status) {
    case "VERIFIED":
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
    case "SOURCE_CONFIRMED":
      return "border-teal-300 bg-teal-50 text-teal-900";
    case "EVIDENCE_INCOMPLETE":
      return "border-amber-300 bg-amber-50 text-amber-950";
    case "REVIEW_REQUIRED":
    case "CONFLICT":
      return "border-red-300 bg-red-50 text-red-900";
    default:
      return "border-slate-300 bg-slate-50 text-slate-800";
  }
}

function ClaimBlock({ claim }: { claim: DossierClaim }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {claim.label}
          </p>
          <p className="mt-1 text-lg font-semibold text-navy-900">
            {claim.value ?? "UNKNOWN"}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
            {claim.status.replace(/_/g, " ")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
        >
          {open ? "Hide evidence" : "View evidence chain"}
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-600">Why? {claim.why}</p>
      {open ? (
        <dl className="mt-3 space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Source</dt>
            <dd>{claim.source ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Source URL</dt>
            <dd className="truncate max-w-[60%]">
              {claim.sourceUrl ? (
                <a href={claim.sourceUrl} className="underline" target="_blank" rel="noreferrer">
                  Open
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Observed</dt>
            <dd>{claim.observedAt?.slice(0, 10) ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Confidence</dt>
            <dd>{claim.confidence ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Resolution</dt>
            <dd>{claim.resolutionState ?? claim.status}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}

type Props = {
  dossier: AuctionEvidenceDossier;
};

export default function AuctionEvidenceDossierPanel({ dossier }: Props) {
  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-navy-900/10 bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
          Auction Evidence Dossier
        </p>
        <h1 className="mt-2 text-2xl font-bold text-navy-900 sm:text-3xl">
          {dossier.headline}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{dossier.subheadline}</p>
        <p className="mt-1 text-xs text-slate-400">
          {dossier.positioning.secondary} · Version {dossier.version}
        </p>

        <div
          className={`mt-4 rounded-xl border px-4 py-3 ${truthTone(dossier.truthStatus)}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide">Auction truth status</p>
          <p className="mt-1 text-lg font-bold">{dossier.outcomeLabel}</p>
          <p className="mt-0.5 text-xs font-medium opacity-80">
            Engine: {dossier.truthStatus.replace(/_/g, " ")}
          </p>
          <p className="mt-1 text-sm opacity-90">{dossier.truthWhy}</p>
          <p className="mt-2 text-xs opacity-80">
            Sources checked: {dossier.provenanceSummary.sourcesChecked}
            {dossier.provenanceSummary.lastChecked
              ? ` · Last checked ${dossier.provenanceSummary.lastChecked.slice(0, 10)}`
              : ""}
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] uppercase text-slate-500">Engine status</p>
            <p className="font-semibold text-navy-900">{dossier.coverage.engineStatus}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] uppercase text-slate-500">Data coverage</p>
            <p className="font-semibold text-navy-900">{dossier.coverage.dataCoverage}</p>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <ClaimBlock claim={dossier.saleOutcome} />
        <ClaimBlock claim={dossier.salePrice} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-navy-900">Auction timeline</h2>
        <p className="mt-1 text-xs text-slate-500">
          Chronological auction events for this Property Master — relistings made obvious.
        </p>
        {dossier.timeline.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            No historical auction events on the evidence chain yet — INSUFFICIENT DATA.
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {dossier.timeline.map((ev, idx) => (
              <li
                key={`${ev.auctionEventId ?? "evt"}-${idx}`}
                className="relative rounded-xl border border-slate-100 px-4 py-3"
              >
                {idx > 0 ? (
                  <p className="mb-2 text-[10px] uppercase tracking-wide text-slate-400">
                    Relisted / subsequent event
                  </p>
                ) : null}
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-navy-900">
                    {ev.auctionDate?.slice(0, 10) ?? "Date unknown"}
                  </p>
                  <span className="text-[10px] font-semibold uppercase text-slate-500">
                    {ev.truthStatus.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-700">
                  Outcome: <span className="font-medium">{ev.outcome}</span>
                  {" · "}
                  Sale price: <span className="font-medium">{ev.salePriceDisplay}</span>
                </p>
                {ev.sourceUrl ? (
                  <a
                    href={ev.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-[11px] text-slate-400 underline"
                  >
                    {ev.sourceUrl}
                  </a>
                ) : null}
                {ev.notes.map((n) => (
                  <p key={n} className="mt-1 text-[11px] text-amber-800">
                    {n}
                  </p>
                ))}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-navy-900">Evidence chain</h2>
        <ol className="mt-3 space-y-2 text-sm">
          {dossier.evidenceChain.map((step, i) => (
            <li key={step.key} className="flex gap-3">
              <span className="w-5 shrink-0 text-slate-400">{i === 0 ? "•" : "↓"}</span>
              <div>
                <p className="font-medium text-navy-900">
                  {step.label}{" "}
                  <span className="text-[10px] uppercase text-slate-400">
                    ({step.status})
                  </span>
                </p>
                <p className="text-xs text-slate-600">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-navy-900">Investor research view</h2>
        <p className="mt-1 text-xs text-slate-500">
          Intelligence and evidence only — not financial instructions. No BUY/SELL language.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(
            [
              ["What happened?", dossier.investorView.whatHappened],
              ["What is proven?", dossier.investorView.whatIsProven],
              ["What is unknown?", dossier.investorView.whatIsUnknown],
              ["What does the market say?", dossier.investorView.whatMarketSays],
              ["What should I investigate?", dossier.investorView.whatToInvestigate],
            ] as const
          ).map(([title, items]) => (
            <div key={title} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {title}
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-navy-900">Comparables & market</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-slate-100 px-3 py-2">
            <dt className="text-slate-500">Comparable-ready</dt>
            <dd className="font-semibold text-navy-900">
              {dossier.comparables.insufficient
                ? "INSUFFICIENT DATA"
                : `${dossier.comparables.count} · ${dossier.comparables.confidence ?? ""}`}
            </dd>
            {dossier.comparables.reason ? (
              <p className="mt-1 text-xs text-slate-500">{dossier.comparables.reason}</p>
            ) : null}
          </div>
          <div className="rounded-lg border border-slate-100 px-3 py-2">
            <dt className="text-slate-500">Market median</dt>
            <dd className="font-semibold text-navy-900">{dossier.market.medianDisplay}</dd>
            <p className="mt-1 text-xs text-slate-500">
              {dossier.market.thresholdRequired} verified sales required ·{" "}
              {dossier.market.verifiedSalesAvailable} currently available
            </p>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-navy-900">Property identity</h2>
        <dl className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100">
          {dossier.identityClaims.slice(0, 18).map((f) => (
            <div
              key={`${f.label}-${f.value ?? "null"}`}
              className="flex flex-wrap justify-between gap-2 px-3 py-2 text-sm"
            >
              <dt className="text-slate-500">{f.label}</dt>
              <dd className="font-medium text-navy-900">
                {f.value ?? "UNKNOWN"}{" "}
                <span className="text-[10px] uppercase text-slate-400">
                  ({f.status.replace(/_/g, " ")})
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </section>
  );
}
