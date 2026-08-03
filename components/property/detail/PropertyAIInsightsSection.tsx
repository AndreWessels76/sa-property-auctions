import GatedAIValuation from "@/app/components/investor/GatedAIValuation";
import GatedPropertyAnalytics from "@/app/components/investor/GatedPropertyAnalytics";
import PropertyIntelligenceCard from "@/app/components/investor/PropertyIntelligenceCard";
import type { PropertyIntelligenceDTO } from "@/lib/dto/PropertyIntelligenceDTO";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

type Props = {
  property: PropertyDTO;
  intelligence: PropertyIntelligenceDTO;
  comparablePrices: number[];
};

export default function PropertyAIInsightsSection({
  property,
  intelligence,
  comparablePrices,
}: Props) {
  return (
    <section
      aria-labelledby="ai-insights-heading"
      className="space-y-6"
    >
      <div>
        <h2
          id="ai-insights-heading"
          className="text-xl font-bold text-navy-900"
        >
          AI insights
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Premium analysis only — clearly separated from verified listing facts
          above. AI observations are indicative, not guarantees.
        </p>
      </div>

      <PropertyIntelligenceCard intelligence={intelligence} />

      <GatedAIValuation
        estimatedValue={property.estimated_value ?? 0}
        auctionPrice={property.auction_price ?? 0}
        comparablePrices={comparablePrices}
      />

      <GatedPropertyAnalytics
        estimatedValue={property.estimated_value ?? 0}
        auctionPrice={property.auction_price ?? 0}
        comparablePrices={comparablePrices}
      />
    </section>
  );
}
