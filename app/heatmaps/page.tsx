import type { Metadata } from "next";
import GatedHeatMapDashboard from "@/app/components/heatmap/GatedHeatMapDashboard";
import { PropertyIntelligenceService } from "@/lib/services/PropertyIntelligenceService";

export const metadata: Metadata = {
  title: "Auction Heat Maps | SA Property Auctions",
  description:
    "Verified auction density heat maps derived from production listings only.",
};

export default async function HeatmapsPage() {
  const properties = await PropertyIntelligenceService.getHeatmapProperties();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
          Verified intelligence
        </p>
        <h1 className="mt-1 text-3xl font-bold text-navy-900">Heat Maps</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Density layers built only from verified listings with coordinates.
          Empty regions mean no verified GPS — never fabricated.
        </p>
        <p className="mt-2 text-xs font-medium text-slate-500">
          Mapped points: {properties.length}
        </p>
      </header>
      <GatedHeatMapDashboard properties={properties} />
    </main>
  );
}
