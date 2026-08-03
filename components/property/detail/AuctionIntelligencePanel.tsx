import type { ReactNode } from "react";
import { formatAuctionDate } from "@/lib/format";
import type { AuctionIntelligencePanel } from "@/lib/property/auctionIntelligence";

type Props = {
  panel: AuctionIntelligencePanel;
};

function ConfidenceBadge({ level }: { level: "High" | "Medium" | "Low" }) {
  const styles =
    level === "High"
      ? "bg-emerald-100 text-emerald-900"
      : level === "Medium"
        ? "bg-amber-100 text-amber-950"
        : "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${styles}`}
    >
      {level}
    </span>
  );
}

function Metric({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <div className="mt-1.5 text-sm font-semibold text-navy-900">{children}</div>
    </div>
  );
}

/**
 * Auction Intelligence Panel — verified production data only.
 * No AI guessing. No fabricated investment scores.
 */
export default function AuctionIntelligencePanelCard({ panel }: Props) {
  return (
    <section
      aria-labelledby="auction-intelligence-heading"
      className="rounded-2xl border border-navy-900/10 bg-white p-5 shadow-md sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
            Verified data
          </p>
          <h2
            id="auction-intelligence-heading"
            className="mt-1 text-xl font-bold text-navy-900"
          >
            Auction Intelligence
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Derived only from verified production listings
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Days until auction">
          <span
            className={
              panel.daysUntilAuction.status === "today"
                ? "text-emerald-700"
                : panel.daysUntilAuction.status === "completed"
                  ? "text-slate-500"
                  : ""
            }
          >
            {panel.daysUntilAuction.label}
          </span>
        </Metric>

        <Metric label="Listing quality">
          <div>
            <span className="text-2xl font-bold text-navy-900">
              {panel.listingQuality.percent}%
            </span>
            <ul className="mt-2 flex flex-wrap gap-1">
              {panel.listingQuality.factors.map((f) => (
                <li
                  key={f.key}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    f.present
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-500"
                  }`}
                  title={f.present ? `${f.label} present` : `${f.label} missing`}
                >
                  {f.label}
                </li>
              ))}
            </ul>
          </div>
        </Metric>

        <Metric label="Verification confidence">
          <ConfidenceBadge level={panel.verificationConfidence} />
        </Metric>

        <Metric label="Comparable confidence">
          <ConfidenceBadge level={panel.comparableConfidence} />
        </Metric>

        <Metric label="Area activity">
          {panel.areaActivity.label}
        </Metric>

        <Metric label="Property type activity">
          {panel.propertyTypeActivity.label}
        </Metric>

        <Metric label="Agency activity">
          <div>
            <p>{panel.agencyActivity.agencyName}</p>
            <p className="mt-1 text-xs font-medium text-slate-600">
              {panel.agencyActivity.activeCount > 0
                ? `${panel.agencyActivity.activeCount} active auction${panel.agencyActivity.activeCount === 1 ? "" : "s"}`
                : panel.agencyActivity.label}
            </p>
          </div>
        </Metric>

        <Metric label="Verification status">
          <dl className="space-y-1 text-xs font-medium text-slate-600">
            <div className="flex justify-between gap-2">
              <dt>Status</dt>
              <dd className="font-semibold text-navy-900">
                {panel.verificationStatus.state}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Last verified</dt>
              <dd>
                {panel.verificationStatus.lastVerified
                  ? formatAuctionDate(panel.verificationStatus.lastVerified)
                  : "Not recorded"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Imported</dt>
              <dd>
                {panel.verificationStatus.imported
                  ? formatAuctionDate(panel.verificationStatus.imported)
                  : "Not recorded"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Verifier</dt>
              <dd>{panel.verificationStatus.verifier}</dd>
            </div>
          </dl>
        </Metric>

        <Metric label="Source trust">
          <div>
            <p className="font-semibold text-navy-900">
              {panel.sourceTrust.label}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Imported directly from {panel.sourceTrust.importedFrom}
            </p>
          </div>
        </Metric>
      </div>

      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Documents availability
        </p>
        <ul className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
          {(
            [
              ["Brochure", panel.documents.brochure],
              ["Auction rules", panel.documents.auctionRules],
              ["Conditions", panel.documents.conditions],
              ["Viewing", panel.documents.viewing],
            ] as const
          ).map(([label, available]) => (
            <li
              key={label}
              className={`rounded-lg px-2.5 py-1 ${
                available
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-white text-slate-400 ring-1 ring-slate-200"
              }`}
            >
              {label}: {available ? "Available" : "Not linked"}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 border-t border-dashed border-slate-200 pt-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Coming soon — Market Intelligence
        </p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {panel.futureReserved.map((item) => (
            <li
              key={item.title}
              className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500"
            >
              <span className="font-semibold text-slate-600">{item.title}</span>
              <span className="mt-0.5 block">{item.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
