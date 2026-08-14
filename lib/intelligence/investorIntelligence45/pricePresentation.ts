/**
 * Price evidence presentation — strict semantic separation.
 */

import { buildSaleEvidence } from "@/lib/intelligence/comparables/saleEvidence";
import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { Property } from "@/lib/types/property";
import type { PriceEvidenceField } from "./types";

function field(
  label: string,
  type: string,
  value: number | null,
  source: string | null,
  evidenceStatus: string,
  date: string | null,
  confidence: string | null,
): PriceEvidenceField {
  return { label, type, value, source, evidenceStatus, date, confidence };
}

export function buildPriceEvidenceFields(
  property: Property,
  observation?: HistoricalEventObservation | null,
): PriceEvidenceField[] {
  const source = property.source_name ?? property.auction_agency ?? null;
  const date = property.auction_date ?? observation?.auctionDate ?? null;
  const sale = observation ? buildSaleEvidence(observation) : null;

  const fields: PriceEvidenceField[] = [];

  const auctionPrice = sale?.auctionPrice ?? property.auction_price ?? null;
  fields.push(
    field(
      "Auction price",
      "auction_price",
      auctionPrice,
      source,
      auctionPrice != null ? "Supplied" : "Not supplied",
      date,
      auctionPrice != null ? "MEDIUM" : null,
    ),
  );

  const startingBid = sale?.startingBid ?? null;
  if (startingBid != null) {
    fields.push(
      field(
        "Starting bid",
        "starting_bid",
        startingBid,
        source,
        "Supplied",
        date,
        "MEDIUM",
      ),
    );
  }

  const guide = sale?.guidePrice ?? null;
  if (guide != null) {
    fields.push(
      field("Guide price", "guide_price", guide, source, "Supplied", date, "MEDIUM"),
    );
  }

  const reserve = sale?.reservePrice ?? property.reserve_price ?? null;
  fields.push(
    field(
      "Reserve price",
      "reserve_price",
      reserve,
      source,
      reserve != null ? "Supplied" : "Not supplied",
      date,
      reserve != null ? "LOW" : null,
    ),
  );

  const estimated = sale?.estimatedValue ?? property.estimated_value ?? null;
  if (estimated != null) {
    fields.push(
      field(
        "Estimated value",
        "estimated_value",
        estimated,
        source,
        "Supplied",
        date,
        "LOW",
      ),
    );
  }

  const salePrice = sale?.salePrice ?? null;
  fields.push(
    field(
      "Sale price",
      "sale_price",
      salePrice,
      source,
      sale?.verifiedSale
        ? "Verified"
        : salePrice != null
          ? "Supplied"
          : "Not supplied",
      date,
      sale?.verifiedSale ? "HIGH" : salePrice != null ? "MEDIUM" : null,
    ),
  );

  return fields.filter((f) => f.value != null || f.type === "sale_price" || f.type === "auction_price" || f.type === "reserve_price");
}

export function rejectPriceKindAsSale(kind: string): boolean {
  return kind !== "sale_price";
}
