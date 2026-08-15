/**
 * Evidence-change alert signals — pure detection over existing intelligence deltas.
 * Never infers SOLD from expired/completed. Never alerts on guide→sale mapping.
 * Delivery status is prepared — never mark DELIVERED without confirmation.
 */

export type EvidenceAlertType =
  | "NEW_AUCTION"
  | "AUCTION_DATE_CHANGED"
  | "AUCTION_CANCELLED"
  | "AUCTION_RESCHEDULED"
  | "PRICE_CHANGED"
  | "NEW_SOURCE_DISCOVERED"
  | "NEW_HISTORICAL_EVIDENCE"
  | "SOLD_EVIDENCE_DISCOVERED"
  | "VERIFIED_SALE_PRICE_DISCOVERED"
  | "NEW_VERIFIED_SALE"
  | "NEW_VERIFIED_SALE_PRICE"
  | "OUTCOME_CHANGED"
  | "PRICE_VERIFIED"
  | "EVIDENCE_CONFLICT"
  | "IDENTITY_REVIEW_REQUIRED"
  | "COMPARABLE_READY"
  | "COMPARABLE_DISCOVERED"
  | "MARKET_READY_TOWN"
  | "CONFLICT_DETECTED"
  | "PROPERTY_RELISTED";

export type EvidenceAlertDeliveryStatus =
  | "DETECTED"
  | "QUEUED"
  | "DELIVERED"
  | "FAILED";

export type EvidenceAlertSignal = {
  type: EvidenceAlertType;
  title: string;
  message: string;
  eventId: string | null;
  propertyId: string | null;
  alertType: EvidenceAlertType;
  evidenceStatus: string;
  source: string | null;
  sourceUrl: string | null;
  observedAt: string | null;
  confidence: string | null;
  deliveryStatus: EvidenceAlertDeliveryStatus;
};

export type EvidenceSnapshot = {
  auctionEventIds: string[];
  auctionDates: string[];
  outcomes: string[];
  verifiedSalePrices: number;
  soldEvidence: number;
  sourceUrls: string[];
  conflicts: number;
  comparableCount: number;
  marketReadyTowns?: number;
  identityReviewRequired?: number;
  propertyId?: string | null;
  eventId?: string | null;
  source?: string | null;
  observedAt?: string | null;
  confidence?: string | null;
  guideOrReserveOnly?: boolean;
};

function basePayload(
  type: EvidenceAlertType,
  title: string,
  message: string,
  snap: EvidenceSnapshot,
  evidenceStatus: string,
): EvidenceAlertSignal {
  return {
    type,
    title,
    message,
    eventId: snap.eventId ?? snap.auctionEventIds[0] ?? null,
    propertyId: snap.propertyId ?? null,
    alertType: type,
    evidenceStatus,
    source: snap.source ?? null,
    sourceUrl: snap.sourceUrls[0] ?? null,
    observedAt: snap.observedAt ?? null,
    confidence: snap.confidence ?? null,
    /** Detection only — never claim delivery without confirmation. */
    deliveryStatus: "DETECTED",
  };
}

/**
 * Compare before/after evidence snapshots. Only emits alerts for real deltas.
 */
export function detectEvidenceAlerts(
  before: EvidenceSnapshot,
  after: EvidenceSnapshot,
): EvidenceAlertSignal[] {
  const signals: EvidenceAlertSignal[] = [];

  const newEvents = after.auctionEventIds.filter((id) => !before.auctionEventIds.includes(id));
  if (newEvents.length > 0) {
    if (before.auctionEventIds.length > 0) {
      signals.push(
        basePayload(
          "PROPERTY_RELISTED",
          "Property relisted",
          `${newEvents.length} additional auction event(s) detected on the Property Master chain.`,
          after,
          "SOURCE_CONFIRMED",
        ),
      );
    } else {
      signals.push(
        basePayload(
          "NEW_AUCTION",
          "New auction",
          `${newEvents.length} auction event(s) discovered.`,
          after,
          "SOURCE_FOUND",
        ),
      );
    }
  }

  const dateChanged =
    after.auctionDates.some((d) => d && !before.auctionDates.includes(d)) &&
    before.auctionDates.length > 0;
  if (dateChanged) {
    const cancelled = after.outcomes.some((o) => o.toUpperCase() === "CANCELLED");
    if (cancelled && !before.outcomes.some((o) => o.toUpperCase() === "CANCELLED")) {
      signals.push(
        basePayload(
          "AUCTION_CANCELLED",
          "Auction cancelled",
          "Explicit cancellation evidence detected.",
          after,
          "SOURCE_CONFIRMED",
        ),
      );
    } else {
      signals.push(
        basePayload(
          "AUCTION_DATE_CHANGED",
          "Auction date changed",
          "A different auction date appeared in source-backed evidence.",
          after,
          "SOURCE_CONFIRMED",
        ),
      );
      signals.push(
        basePayload(
          "AUCTION_RESCHEDULED",
          "Auction rescheduled",
          "Schedule change from explicit date evidence delta.",
          after,
          "SOURCE_CONFIRMED",
        ),
      );
    }
  }

  if (after.outcomes.join("|") !== before.outcomes.join("|") && before.outcomes.length > 0) {
    signals.push(
      basePayload(
        "OUTCOME_CHANGED",
        "Outcome changed",
        "Explicit outcome evidence changed between snapshots.",
        after,
        "OUTCOME_FOUND",
      ),
    );
  }

  const newSources = after.sourceUrls.filter((u) => u && !before.sourceUrls.includes(u));
  if (newSources.length > 0) {
    signals.push(
      basePayload(
        "NEW_SOURCE_DISCOVERED",
        "New source discovered",
        `${newSources.length} additional source URL(s) on the evidence chain.`,
        after,
        "SOURCE_FOUND",
      ),
    );
  }

  if (after.soldEvidence > before.soldEvidence) {
    signals.push(
      basePayload(
        "SOLD_EVIDENCE_DISCOVERED",
        "Sold evidence discovered",
        "Explicit SOLD outcome evidence increased.",
        after,
        "OUTCOME_FOUND",
      ),
    );
    signals.push(
      basePayload(
        "NEW_VERIFIED_SALE",
        "New verified sale",
        "Additional explicit SOLD evidence on the chain.",
        after,
        "OUTCOME_FOUND",
      ),
    );
  }

  if (after.verifiedSalePrices > before.verifiedSalePrices) {
    signals.push(
      basePayload(
        "VERIFIED_SALE_PRICE_DISCOVERED",
        "Verified sale price discovered",
        "Explicit verified sale price evidence increased.",
        after,
        "SALE_PRICE_FOUND",
      ),
    );
    signals.push(
      basePayload(
        "NEW_VERIFIED_SALE_PRICE",
        "New verified sale price",
        "Verified sale-price count increased.",
        after,
        "SALE_PRICE_FOUND",
      ),
    );
    signals.push(
      basePayload(
        "PRICE_VERIFIED",
        "Price verified",
        "Sale price advanced to verified evidence state.",
        after,
        "VERIFIED",
      ),
    );
  }

  // Never treat guide/reserve-only as sale price alerts
  if (!(after.guideOrReserveOnly && after.verifiedSalePrices === before.verifiedSalePrices)) {
    if (after.verifiedSalePrices !== before.verifiedSalePrices) {
      signals.push(
        basePayload(
          "PRICE_CHANGED",
          "Verified price evidence changed",
          "Verified sale-price evidence count changed.",
          after,
          "SALE_PRICE_FOUND",
        ),
      );
    }
  }

  if (after.conflicts > before.conflicts) {
    signals.push(
      basePayload(
        "CONFLICT_DETECTED",
        "Conflict detected",
        "Conflicting evidence requires review.",
        after,
        "CONFLICT",
      ),
    );
    signals.push(
      basePayload(
        "EVIDENCE_CONFLICT",
        "Evidence conflict",
        "Sources disagree on outcome or sale price.",
        after,
        "CONFLICT",
      ),
    );
  }

  if ((after.identityReviewRequired ?? 0) > (before.identityReviewRequired ?? 0)) {
    signals.push(
      basePayload(
        "IDENTITY_REVIEW_REQUIRED",
        "Identity review required",
        "Unsafe or weak property identity requires human review.",
        after,
        "REVIEW_REQUIRED",
      ),
    );
  }

  if (after.comparableCount > before.comparableCount) {
    signals.push(
      basePayload(
        "COMPARABLE_DISCOVERED",
        "Comparable discovered",
        "Additional comparable-ready evidence detected.",
        after,
        "COMPARABLE_READY",
      ),
    );
  }

  // Threshold: comparable ready when count crosses minimum 3
  if (before.comparableCount < 3 && after.comparableCount >= 3) {
    signals.push(
      basePayload(
        "COMPARABLE_READY",
        "Comparable ready",
        "Comparable threshold met (≥3 verified comparable sales).",
        after,
        "COMPARABLE_READY",
      ),
    );
  }

  if ((before.marketReadyTowns ?? 0) < (after.marketReadyTowns ?? 0)) {
    signals.push(
      basePayload(
        "MARKET_READY_TOWN",
        "Market-ready town",
        "A town reached ≥5 verified sale prices.",
        after,
        "MARKET_READY",
      ),
    );
  }

  if (
    after.auctionEventIds.length > before.auctionEventIds.length ||
    after.sourceUrls.length > before.sourceUrls.length
  ) {
    if (!signals.some((s) => s.type === "NEW_HISTORICAL_EVIDENCE")) {
      signals.push(
        basePayload(
          "NEW_HISTORICAL_EVIDENCE",
          "New historical evidence",
          "Historical evidence chain grew.",
          after,
          "EXTRACTION_COMPLETE",
        ),
      );
    }
  }

  return signals;
}

/** Queue for delivery — still not DELIVERED. */
export function queueEvidenceAlert(
  signal: EvidenceAlertSignal,
): EvidenceAlertSignal {
  return { ...signal, deliveryStatus: "QUEUED" };
}

/**
 * Mark delivered ONLY with explicit confirmation.
 * Without confirmation → FAILED (never silent DELIVERED).
 */
export function confirmEvidenceAlertDelivery(
  signal: EvidenceAlertSignal,
  confirmation: { delivered: boolean; providerReceiptId?: string | null },
): EvidenceAlertSignal {
  if (!confirmation.delivered || !confirmation.providerReceiptId) {
    return { ...signal, deliveryStatus: "FAILED" };
  }
  return { ...signal, deliveryStatus: "DELIVERED" };
}

export function summarizeAlertDelivery(
  signals: EvidenceAlertSignal[],
): Record<EvidenceAlertDeliveryStatus, number> {
  return {
    DETECTED: signals.filter((s) => s.deliveryStatus === "DETECTED").length,
    QUEUED: signals.filter((s) => s.deliveryStatus === "QUEUED").length,
    DELIVERED: signals.filter((s) => s.deliveryStatus === "DELIVERED").length,
    FAILED: signals.filter((s) => s.deliveryStatus === "FAILED").length,
  };
}
