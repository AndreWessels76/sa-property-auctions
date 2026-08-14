/**
 * Property Master historical event chain.
 */

import { isValidPositiveAmount } from "@/lib/intelligence/pricing/priceCalculations";
import { publicHistoricalRows } from "@/lib/intelligence/historical/historicalAggregation";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { MasterHistoryEvent } from "./types";
import { provenanceForObservation } from "./provenance";

export function buildMasterHistory(
  observations: HistoricalEventObservation[],
  masterId: string,
): MasterHistoryEvent[] {
  const historical = publicHistoricalRows(observations).filter(
    (o) => o.propertyMasterId === masterId,
  );

  return [...historical]
    .sort((a, b) => (a.auctionDate ?? "").localeCompare(b.auctionDate ?? ""))
    .map((row) => ({
      year: row.auctionDate ? new Date(row.auctionDate).getFullYear() : 0,
      auctionDate: row.auctionDate,
      state: row.state,
      salePrice: isValidPositiveAmount(row.prices.sale_price)
        ? row.prices.sale_price
        : null,
      auctionEventId: row.auctionEventId,
      sourceName: row.sourceName,
      sourceUrl: row.sourceUrl,
      provenance: provenanceForObservation(row),
    }));
}
