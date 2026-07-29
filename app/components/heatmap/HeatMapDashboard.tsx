"use client";

import { useMemo, useState } from "react";
import HeatControls from "./HeatControls";
import HeatLegend from "./HeatLegend";
import HeatMapLayer from "./HeatMapLayer";
import { buildHeatPoints } from "@/lib/heatmap/heatCalculator";
import type { HeatPoint } from "@/lib/heatmap/heatTypes";
import PremiumBadge from "@/app/components/auth/PremiumBadge";

type HeatMapDashboardProps = {
  properties?: Array<{
    latitude?: number | null;
    longitude?: number | null;
    opportunity_score?: number | null;
    title?: string | null;
    town?: string | null;
  }>;
};

const SAMPLE_PROPERTIES = [
  {
    title: "Johannesburg opportunity cluster",
    town: "Johannesburg",
    latitude: -26.2041,
    longitude: 28.0473,
    opportunity_score: 88,
  },
  {
    title: "Cape Town growth pocket",
    town: "Cape Town",
    latitude: -33.9249,
    longitude: 18.4241,
    opportunity_score: 76,
  },
  {
    title: "Durban risk zone",
    town: "Durban",
    latitude: -29.8587,
    longitude: 31.0218,
    opportunity_score: 54,
  },
  {
    title: "Pretoria auction density",
    town: "Pretoria",
    latitude: -25.7479,
    longitude: 28.2293,
    opportunity_score: 81,
  },
];

function categoryLabel(category: HeatPoint["category"]) {
  switch (category) {
    case "roi":
      return "ROI";
    case "growth":
      return "Growth";
    case "risk":
      return "Risk";
    default:
      return "Auction";
  }
}

export default function HeatMapDashboard({
  properties = SAMPLE_PROPERTIES,
}: HeatMapDashboardProps) {
  const [enabled, setEnabled] = useState(true);

  const points = useMemo(() => {
    const withCoords = properties.filter(
      (property) =>
        typeof property.latitude === "number" &&
        typeof property.longitude === "number",
    );

    return buildHeatPoints(
      withCoords.map((property) => ({
        ...property,
        opportunity_score: property.opportunity_score ?? 50,
      })),
    );
  }, [properties]);

  const averageWeight =
    points.length > 0
      ? points.reduce((sum, point) => sum + point.weight, 0) / points.length
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h1 className="text-2xl font-bold text-navy-900">Heat Map</h1>
            <PremiumBadge />
          </div>
          <p className="text-sm text-slate-500">
            Opportunity density across auction markets
          </p>
        </div>

        <HeatControls
          enabled={enabled}
          onToggle={() => setEnabled((value) => !value)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
        <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-navy-900 to-slate-800 p-6 text-white shadow-sm">
          <HeatMapLayer enabled={enabled} />

          {!enabled ? (
            <div className="flex h-full min-h-[360px] items-center justify-center text-sm text-slate-300">
              Heat map hidden
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {points.map((point, index) => (
                <div
                  key={`${point.latitude}-${point.longitude}-${index}`}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-300">
                    {categoryLabel(point.category)}
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    Weight {(point.weight * 100).toFixed(0)}%
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {point.latitude.toFixed(3)}, {point.longitude.toFixed(3)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        <div className="space-y-4">
          <HeatLegend />
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Active points
            </p>
            <p className="mt-1 text-2xl font-bold text-navy-900">
              {enabled ? points.length : 0}
            </p>
            <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">
              Avg intensity
            </p>
            <p className="mt-1 text-lg font-semibold text-navy-900">
              {enabled ? `${Math.round(averageWeight * 100)}%` : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
