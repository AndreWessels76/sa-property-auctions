"use client";

import { PremiumGuard } from "@/app/components/subscription";
import AIValuationCard from "./AIValuationCard";

type GatedAIValuationProps = {
  estimatedValue: number;
  auctionPrice: number;
  comparablePrices?: number[];
};

export default function GatedAIValuation({
  estimatedValue,
  auctionPrice,
  comparablePrices,
}: GatedAIValuationProps) {
  return (
    <PremiumGuard>
      <AIValuationCard
        estimatedValue={estimatedValue}
        auctionPrice={auctionPrice}
        comparablePrices={comparablePrices}
      />
    </PremiumGuard>
  );
}
