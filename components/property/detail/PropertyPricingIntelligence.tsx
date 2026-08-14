import AuctionPriceIntelligencePanel from "@/components/property/detail/AuctionPriceIntelligencePanel";
import type { AuctionPriceIntelligence } from "@/lib/intelligence/pricing";

type Props = {
  intelligence: AuctionPriceIntelligence;
  /** @deprecated retained for call-site compatibility — unused */
  confidence?: number | null;
};

/**
 * Sticky aside pricing surface for property detail.
 * Renders Auction Price Intelligence 2A (deterministic, no fabricated values).
 */
export default function PropertyPricingIntelligence({ intelligence }: Props) {
  return <AuctionPriceIntelligencePanel intelligence={intelligence} />;
}
