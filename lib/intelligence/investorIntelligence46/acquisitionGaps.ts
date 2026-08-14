/**
 * Extended acquisition gap detection (II 4.6) — builds on II 4.5.
 */

import { buildSaleEvidence } from "@/lib/intelligence/comparables/saleEvidence";
import { detectAcquisitionGaps as detectGaps45 } from "@/lib/intelligence/investorIntelligence45/acquisitionGaps";
import type { BuildContext } from "@/lib/intelligence/investorIntelligence45/types";
import type { Property } from "@/lib/types/property";
import { II46_MINIMUM_COMPARABLE_SALES, II46_MINIMUM_MARKET_SALES } from "./config";
import type { AcquisitionGap46, AcquisitionGapCode } from "./types";

function gap(
  gapCode: AcquisitionGapCode,
  priority: AcquisitionGap46["priority"],
  reason: string,
  requiredEvidence: string,
  recommendedExistingQueue: string,
  town?: string | null,
  agency?: string | null,
): AcquisitionGap46 {
  return { gapCode, priority, reason, requiredEvidence, recommendedExistingQueue, town, agency };
}

export function detectAcquisitionGaps46(input: {
  property: Property;
  ctx: BuildContext;
  comparableCount: number;
  rejectedComparableCount: number;
  hasConflict: boolean;
  historicalEventCount: number;
}): AcquisitionGap46[] {
  const gaps: AcquisitionGap46[] = [];
  const { property, ctx } = input;
  const town = property.town ?? ctx.town ?? null;
  const agency = property.auction_agency ?? ctx.agency ?? null;

  if (input.hasConflict) {
    gaps.push(
      gap(
        "IDENTITY_REVIEW_REQUIRED",
        "P1",
        "Unresolved conflicting evidence blocks comparable and market intelligence",
        "Admin resolution of conflicting source values",
        "Historical Resolution 4.2 / HEQ 4.4 review",
        town,
        agency,
      ),
    );
  }

  if (!property.source_url && !property.source_name) {
    gaps.push(
      gap(
        "SOURCE_MISSING",
        "P1",
        "No licensed source URL or source name on listing",
        "Source URL and snapshot",
        "Source Refetch / Due Diligence Extraction",
        town,
        agency,
      ),
    );
  }

  if (!property.property_master_id) {
    gaps.push(
      gap(
        "IDENTITY_REVIEW_REQUIRED",
        "P2",
        "Property Master not linked — identity chain incomplete",
        "Property Master linkage",
        "Property Identity Engine / History Backfill",
        town,
        agency,
      ),
    );
  }

  if (!property.town && !property.suburb) {
    gaps.push(
      gap(
        "LOCATION_MISSING",
        "P2",
        "Town and suburb not supplied",
        "Location evidence",
        "Due Diligence Extraction",
        town,
        agency,
      ),
    );
  }

  if (!property.floor_size && !property.erf_size && !property.agricultural_details?.totalHectares) {
    gaps.push(
      gap(
        "SIZE_MISSING",
        "P2",
        "No floor size, land size, or agricultural hectares",
        "Size evidence (floor_size or hectares)",
        "Due Diligence Extraction / Pricing Acquisition",
        town,
        agency,
      ),
    );
  }

  const subjectObs = ctx.observations.find((o) => o.listingPropertyId === property.id) ?? ctx.observations[0];
  if (subjectObs) {
    const sale = buildSaleEvidence(subjectObs);
    const outcome = ctx.scoredEvents?.find((e) => e.observation.observationId === subjectObs.observationId)?.classification;

    if (input.historicalEventCount > 0 && outcome?.outcome === "UNKNOWN") {
      gaps.push(
        gap(
          "SALE_OUTCOME_MISSING",
          "P1",
          "Historical event linked but outcome UNKNOWN",
          "Confirmed auction outcome evidence",
          "Historical Evidence Acquisition 4.3",
          town,
          agency,
        ),
      );
    }

    if (outcome?.outcome === "SOLD" && !sale.verifiedSale) {
      gaps.push(
        gap(
          "SALE_PRICE_MISSING",
          "P1",
          "SOLD outcome without verified sale price",
          "Verified sale price observation",
          "Historical Evidence Acquisition 4.3",
          town,
          agency,
        ),
      );
    }
  }

  if (
    !property.auction_price &&
    !property.reserve_price &&
    !property.estimated_value
  ) {
    gaps.push(
      gap(
        "PRICING_OBSERVATION_MISSING",
        "P3",
        "No auction, reserve, or estimated pricing on listing",
        "Pricing observations",
        "Pricing Data Acquisition",
        town,
        agency,
      ),
    );
  }

  if (input.comparableCount < II46_MINIMUM_COMPARABLE_SALES) {
    gaps.push(
      gap(
        "COMPARABLE_DATA_MISSING",
        input.comparableCount === 0 ? "P2" : "P3",
        `Only ${input.comparableCount} accepted comparable(s); minimum ${II46_MINIMUM_COMPARABLE_SALES}`,
        "Verified comparable sales with matching property type",
        "Historical Evidence Acquisition 4.3",
        town,
        agency,
      ),
    );
  }

  const verifiedSales =
    ctx.scoredEvents?.filter(
      (e) => e.classification.outcome === "SOLD" && e.classification.salePrice.salePrice != null,
    ).length ?? 0;

  if (verifiedSales < II46_MINIMUM_MARKET_SALES) {
    gaps.push(
      gap(
        "MARKET_DATA_MISSING",
        verifiedSales === 0 ? "P2" : "P3",
        `Only ${verifiedSales} verified market sale(s); minimum ${II46_MINIMUM_MARKET_SALES}`,
        "Verified sale-price observations for area",
        "Historical Evidence Acquisition 4.3",
        town,
        agency,
      ),
    );
  }

  const legacy = detectGaps45({ ...ctx, town, agency });
  for (const g of legacy) {
    if (!gaps.some((x) => x.gapCode === "MARKET_DATA_MISSING")) {
      gaps.push(
        gap(
          "MARKET_DATA_MISSING",
          g.priority as AcquisitionGap46["priority"],
          `${g.verifiedSales} verified sales; need ${g.required}`,
          "Verified sale-price observations",
          g.recommendedAction,
          g.town,
          g.agency,
        ),
      );
    }
  }

  const priorityOrder = { P1: 0, P2: 1, P3: 2, P4: 3 };
  return gaps.sort(
    (a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority] ||
      a.gapCode.localeCompare(b.gapCode),
  );
}

export function countGapsByPriority(gaps: AcquisitionGap46[]) {
  return {
    p1: gaps.filter((g) => g.priority === "P1").length,
    p2: gaps.filter((g) => g.priority === "P2").length,
    p3: gaps.filter((g) => g.priority === "P3").length,
    p4: gaps.filter((g) => g.priority === "P4").length,
    total: gaps.length,
  };
}
