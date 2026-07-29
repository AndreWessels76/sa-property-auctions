"use client";

import { PremiumGuard } from "@/app/components/subscription";
import PropertyAnalytics from "./PropertyAnalytics";

type Props = {
  estimatedValue: number;
  auctionPrice: number;
  comparablePrices?: number[];
};

export default function GatedPropertyAnalytics({
  estimatedValue,
  auctionPrice,
  comparablePrices,
}: Props) {
  return (
    <PremiumGuard>
      <PropertyAnalytics
        estimatedValue={estimatedValue}
        auctionPrice={auctionPrice}
        comparablePrices={comparablePrices}
      />
    </PremiumGuard>
  );
}
