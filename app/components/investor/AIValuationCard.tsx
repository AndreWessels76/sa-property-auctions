"use client";

import { formatCurrency } from "@/lib/format";
import { valuateProperty } from "@/lib/property/valuation/valuationService";
import PremiumBadge from "@/app/components/auth/PremiumBadge";

type AIValuationCardProps = {
  estimatedValue: number;
  auctionPrice: number;
  comparablePrices?: number[];
};

export default function AIValuationCard({
  estimatedValue,
  auctionPrice,
  comparablePrices = [],
}: AIValuationCardProps) {
  const prices =
    comparablePrices.length > 0
      ? comparablePrices
      : [
          estimatedValue * 0.92,
          estimatedValue,
          estimatedValue * 1.08,
        ];

  const valuation = valuateProperty(prices);
  const upside =
    valuation.estimatedValue > 0
      ? Math.round(
          ((valuation.estimatedValue - auctionPrice) /
            valuation.estimatedValue) *
            100,
        )
      : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-navy-900">AI Valuation</h3>
        <PremiumBadge />
      </div>

      <p className="text-sm text-slate-500">Estimated market value</p>
      <p className="mt-1 text-3xl font-bold text-navy-900">
        {formatCurrency(valuation.estimatedValue)}
      </p>

      <p className="mt-3 text-sm text-slate-500">
        Range{" "}
        <span className="font-medium text-slate-700">
          {formatCurrency(valuation.minimumValue)} –{" "}
          {formatCurrency(valuation.maximumValue)}
        </span>
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Confidence
          </p>
          <p className="mt-1 text-lg font-semibold text-navy-900">
            {Math.round(valuation.confidence)}%
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Auction upside
          </p>
          <p className="mt-1 text-lg font-semibold text-emerald-600">
            {upside > 0 ? `${upside}%` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
