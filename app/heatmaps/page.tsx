import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import GatedHeatMapDashboard from "@/app/components/heatmap/GatedHeatMapDashboard";
import { PropertyService } from "@/lib/services";

export const revalidate = 300;

export default async function HeatmapsPage() {
  const properties = await PropertyService.getProperties();

  const mapped = properties
    .filter(
      (property) =>
        typeof property.latitude === "number" &&
        typeof property.longitude === "number",
    )
    .map((property) => {
      const estimated = property.estimated_value ?? 0;
      const auction = property.auction_price ?? 0;

      return {
        title: property.title,
        town: property.town ?? "",
        latitude: property.latitude as number,
        longitude: property.longitude as number,
        opportunity_score:
          estimated > 0
            ? Math.min(
                99,
                Math.round(((estimated - auction) / estimated) * 100 + 50),
              )
            : 50,
      };
    });

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <GatedHeatMapDashboard properties={mapped} />
        </div>
      </main>
      <Footer />
    </>
  );
}
