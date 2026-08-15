"use client";

import Link from "next/link";
import type { AuctionResearchReport } from "@/lib/property/researchReport";
import type { AuctionEvidenceDossier } from "@/lib/property/auctionEvidenceDossier";

type Props = {
  report: AuctionResearchReport;
  dossier?: AuctionEvidenceDossier | null;
};

export default function ResearchReportSummaryCard({ report, dossier }: Props) {
  const truth = dossier?.truthStatus ?? "INSUFFICIENT_DATA";
  const salePrice = dossier?.salePrice.value ?? "INSUFFICIENT DATA";

  return (
    <section
      aria-labelledby="research-report-heading"
      className="rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
            Auction Evidence Dossier
          </p>
          <h2
            id="research-report-heading"
            className="mt-1 text-xl font-bold text-navy-900"
          >
            Don&apos;t just find the auction. Prove what happened.
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={report.exportHints.sharePath}
            className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Open evidence dossier
          </Link>
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            onClick={() => {
              if (typeof window !== "undefined") window.print();
            }}
          >
            Print
          </button>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">
        {dossier?.subheadline ?? report.executiveSummary}
      </p>
      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
          <dt className="text-slate-400">Truth status</dt>
          <dd className="font-semibold text-navy-900">{truth.replace(/_/g, " ")}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
          <dt className="text-slate-400">Sale price</dt>
          <dd className="font-semibold text-navy-900">{salePrice}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
          <dt className="text-slate-400">Data coverage</dt>
          <dd className="font-semibold text-navy-900">
            {dossier?.coverage.dataCoverage ?? "INSUFFICIENT"}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] text-slate-500">
        Engine {dossier?.coverage.engineStatus ?? "READY"} · Evidence over estimates · Version{" "}
        {dossier?.version ?? report.version} · No investment advice
      </p>
    </section>
  );
}
