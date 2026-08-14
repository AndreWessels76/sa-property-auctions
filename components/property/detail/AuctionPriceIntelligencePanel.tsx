"use client";

import { useId, useState } from "react";
import Link from "next/link";
import type { AuctionPriceIntelligence } from "@/lib/intelligence/pricing";
import { NOT_SUPPLIED } from "@/lib/intelligence/notSupplied";
import { formatAuctionDate } from "@/lib/format";

type Props = {
  intelligence: AuctionPriceIntelligence;
};

function StatusChip({ status }: { status: string }) {
  const label =
    status === "verified"
      ? "Verified"
      : status === "calculated"
        ? "Calculated"
        : status === "historical"
          ? "Historical"
          : status === "not_supplied"
            ? "Not supplied"
            : status === "conflict"
              ? "Conflict"
              : status === "pending"
                ? "Pending"
                : "Source confirmed";
  return (
    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
      {label}
    </span>
  );
}

function FieldRow({
  label,
  display,
  status,
}: {
  label: string;
  display: string;
  status: string;
}) {
  const missing = display === NOT_SUPPLIED || display === "Not available";
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
        <StatusChip status={status} />
      </div>
      <dd
        className={`mt-1 text-lg font-semibold ${missing ? "italic text-slate-400" : "text-navy-900"}`}
      >
        {display}
      </dd>
    </div>
  );
}

export default function AuctionPriceIntelligencePanel({ intelligence }: Props) {
  const methodologyId = useId();
  const [openMethod, setOpenMethod] = useState(false);
  const { current, difference, unitAnalysis, historical, dataQuality } =
    intelligence;

  const hasAny =
    current.auctionPrice.value != null ||
    current.reservePrice.value != null ||
    current.estimatedValue.value != null ||
    current.guidePrice.value != null;

  return (
    <section
      aria-labelledby="auction-price-intelligence-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2
        id="auction-price-intelligence-heading"
        className="text-xl font-bold text-navy-900"
      >
        Auction Price Intelligence
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Decision support from verified listing fields only — not investment advice.
        Values are never invented.
      </p>

      {intelligence.conflictNote ? (
        <p
          role="status"
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          {intelligence.conflictNote}
        </p>
      ) : null}

      {!hasAny ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Insufficient verified data — no auction, reserve, guide, or estimated
          prices are supplied for this listing.
        </p>
      ) : (
        <>
          <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-slate-500">
            Current auction
          </h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <FieldRow
              label={current.auctionPrice.label}
              display={current.auctionPrice.display}
              status={current.auctionPrice.status}
            />
            <FieldRow
              label={current.estimatedValue.label}
              display={current.estimatedValue.display}
              status={current.estimatedValue.status}
            />
            <FieldRow
              label={current.reservePrice.label}
              display={current.reservePrice.display}
              status={current.reservePrice.status}
            />
            <FieldRow
              label={current.guidePrice.label}
              display={current.guidePrice.display}
              status={current.guidePrice.status}
            />
          </dl>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Auction date
              </dt>
              <dd className="mt-1 font-semibold text-navy-900">
                {current.auctionDate
                  ? formatAuctionDate(current.auctionDate)
                  : NOT_SUPPLIED}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Agency
              </dt>
              <dd className="mt-1 font-semibold text-navy-900">
                {current.agency?.trim() || NOT_SUPPLIED}
              </dd>
            </div>
          </dl>

          {difference ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-bold text-navy-900">
                Difference vs reference
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Reference: {difference.referenceLabel}
              </p>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">
                    Difference
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-navy-900">
                    {difference.absoluteDisplay}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">
                    Percentage difference
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-navy-900">
                    {difference.percentageDisplay}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-sm text-slate-600">{difference.narrative}</p>
              <p className="mt-2 text-xs text-slate-500">
                This is not described as a market discount. It compares auction
                price with the labelled reference only.
              </p>
            </div>
          ) : null}

          <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">
            Unit analysis
          </h3>
          <dl className="mt-3 grid gap-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                {unitAnalysis.perBuildingM2.label}
              </dt>
              <dd
                className={`mt-1 text-lg font-semibold ${unitAnalysis.perBuildingM2.available ? "text-navy-900" : "italic text-slate-400"}`}
              >
                {unitAnalysis.perBuildingM2.display}
              </dd>
              {unitAnalysis.perBuildingM2.reason ? (
                <p className="mt-1 text-xs text-slate-500">
                  {unitAnalysis.perBuildingM2.reason}
                </p>
              ) : null}
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                {unitAnalysis.perHectare.label}
              </dt>
              <dd
                className={`mt-1 text-lg font-semibold ${unitAnalysis.perHectare.available ? "text-navy-900" : "italic text-slate-400"}`}
              >
                {unitAnalysis.perHectare.display}
              </dd>
              {unitAnalysis.perHectare.reason ? (
                <p className="mt-1 text-xs text-slate-500">
                  {unitAnalysis.perHectare.reason}
                </p>
              ) : null}
              {unitAnalysis.perHectare.approximate ? (
                <p className="mt-1 text-xs text-amber-800">
                  Approximate land size — calculation is approximate.
                </p>
              ) : null}
            </div>
          </dl>

          <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">
            Historical price
          </h3>
          {historical.timeline.length === 0 ? (
            <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {historical.note ?? "Insufficient verified historical price data."}
              {!intelligence.premium ? (
                <>
                  {" "}
                  <Link href="/pricing" className="font-semibold underline">
                    Upgrade to Premium
                  </Link>{" "}
                  for the full timeline.
                </>
              ) : null}
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <caption className="sr-only">
                  Historical auction prices for this property master
                </caption>
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                    <th scope="col" className="py-2 pr-3">
                      Date
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      Status
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      Price type
                    </th>
                    <th scope="col" className="py-2">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historical.timeline.map((row) => (
                    <tr
                      key={row.auctionEventId}
                      className="border-b border-slate-100"
                    >
                      <td className="py-2 pr-3 text-navy-900">
                        {row.auctionDate
                          ? formatAuctionDate(row.auctionDate)
                          : NOT_SUPPLIED}
                        <span className="ml-2">
                          <StatusChip status="historical" />
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-slate-600">{row.status}</td>
                      <td className="py-2 pr-3 text-slate-600">
                        {row.priceLabel}
                      </td>
                      <td className="py-2 font-semibold text-navy-900">
                        {new Intl.NumberFormat("en-ZA", {
                          style: "currency",
                          currency: "ZAR",
                          maximumFractionDigits: 0,
                        }).format(row.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {historical.change ? (
                <p className="mt-3 text-sm text-slate-600">
                  <span className="font-semibold text-navy-900">
                    Historical auction-price change:
                  </span>{" "}
                  {historical.change.absoluteDisplay} (
                  {historical.change.percentageDisplay}). Not a forecast or
                  expected return.
                </p>
              ) : null}
            </div>
          )}

          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Data availability
            </h3>
            <ul className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
              <li>
                Price data:{" "}
                {dataQuality.priceDataAvailable ? "Available" : "Not supplied"}
              </li>
              <li>
                Reference price:{" "}
                {dataQuality.referencePriceAvailable
                  ? "Available"
                  : "Not supplied"}
              </li>
              <li>
                Building size:{" "}
                {dataQuality.buildingSizeAvailable
                  ? "Available"
                  : "Not supplied"}
              </li>
              <li>
                Land (hectares):{" "}
                {dataQuality.landSizeAvailable ? "Available" : "Not supplied"}
              </li>
              <li>
                Historical prices:{" "}
                {dataQuality.historicalPriceDataAvailable
                  ? "Available"
                  : "Not supplied"}
              </li>
              <li>
                Source verified: {dataQuality.sourceVerified ? "Yes" : "No"}
              </li>
            </ul>
          </div>
        </>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4">
        <button
          type="button"
          className="text-sm font-semibold text-navy-900 underline"
          aria-expanded={openMethod}
          aria-controls={methodologyId}
          onClick={() => setOpenMethod((v) => !v)}
        >
          {openMethod ? "Hide" : "How this was calculated"}
        </button>
        {openMethod ? (
          <div id={methodologyId} className="mt-3 space-y-2 text-xs text-slate-600">
            <p>Methodology version {intelligence.methodologyVersion}</p>
            <ul className="list-disc space-y-1 pl-4">
              {intelligence.methodology.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {intelligence.limitations.length > 0 ? (
              <>
                <p className="font-semibold text-slate-700">Limitations</p>
                <ul className="list-disc space-y-1 pl-4">
                  {intelligence.limitations.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
