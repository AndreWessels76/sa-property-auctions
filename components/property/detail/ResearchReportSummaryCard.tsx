"use client";

import Link from "next/link";
import type { AuctionResearchReport } from "@/lib/property/researchReport";

type Props = {
  report: AuctionResearchReport;
};

export default function ResearchReportSummaryCard({ report }: Props) {
  return (
    <section
      aria-labelledby="research-report-heading"
      className="rounded-2xl border border-navy-900/10 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
            Research report
          </p>
          <h2
            id="research-report-heading"
            className="mt-1 text-xl font-bold text-navy-900"
          >
            Auction Research Report
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={report.exportHints.sharePath}
            className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Open full report
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
        {report.executiveSummary}
      </p>
      <dl className="mt-4 grid gap-2 sm:grid-cols-3 text-xs">
        <div className="rounded-lg bg-white/80 px-3 py-2 ring-1 ring-slate-100">
          <dt className="text-slate-400">Listing quality</dt>
          <dd className="font-semibold text-navy-900">
            {report.intelligenceSummary.listingQualityPercent != null
              ? `${report.intelligenceSummary.listingQualityPercent}%`
              : "—"}
          </dd>
        </div>
        <div className="rounded-lg bg-white/80 px-3 py-2 ring-1 ring-slate-100">
          <dt className="text-slate-400">Verification confidence</dt>
          <dd className="font-semibold text-navy-900">
            {report.intelligenceSummary.verificationConfidence ?? "—"}
          </dd>
        </div>
        <div className="rounded-lg bg-white/80 px-3 py-2 ring-1 ring-slate-100">
          <dt className="text-slate-400">Comparable confidence</dt>
          <dd className="font-semibold text-navy-900">
            {report.intelligenceSummary.comparableConfidence ?? "—"}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] text-slate-500">
        PDF export reserved · Share link · Version {report.version} · No investment advice
      </p>
    </section>
  );
}
