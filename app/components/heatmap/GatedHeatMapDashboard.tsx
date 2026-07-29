"use client";

import { PremiumGuard } from "@/app/components/subscription";
import HeatMapDashboard from "./HeatMapDashboard";

type GatedHeatMapDashboardProps = {
  properties?: React.ComponentProps<typeof HeatMapDashboard>["properties"];
};

export default function GatedHeatMapDashboard({
  properties,
}: GatedHeatMapDashboardProps) {
  return (
    <PremiumGuard>
      <HeatMapDashboard properties={properties} />
    </PremiumGuard>
  );
}
