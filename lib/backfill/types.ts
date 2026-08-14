/**
 * Property History Backfill 1.0 — shared types.
 */

export type BackfillIdentityDecision =
  | "MATCH_CONFIRMED"
  | "MATCH_HIGH_CONFIDENCE"
  | "MATCH_REVIEW"
  | "MATCH_REJECTED"
  | "NEW_MASTER"
  | "INSUFFICIENT_EVIDENCE"
  | "IDENTITY_REVIEW_REQUIRED"
  | "ALREADY_LINKED";

export type BackfillAuditStatus =
  | "MASTER_CREATED"
  | "MASTER_MATCHED"
  | "MASTER_REVIEW"
  | "MASTER_SKIPPED"
  | "EVENT_CREATED"
  | "EVENT_MATCHED"
  | "EVENT_REVIEW"
  | "EVENT_SKIPPED"
  | "DUPLICATE_EVENT"
  | "IDENTITY_CONFLICT"
  | "INSUFFICIENT_EVIDENCE"
  | "LOCATION_DATA_REVIEW";

export type BackfillRunKind = "preview" | "backfill" | "retry";

export type BackfillRunStatus = "running" | "completed" | "failed";

export type BackfillReviewKind = "identity" | "event";

export type BackfillReviewStatus = "pending" | "approved" | "rejected" | "new_master";

export type BackfillIdentityResult = {
  decision: BackfillIdentityDecision;
  autoAttach: boolean;
  matchedMasterId: string | null;
  fingerprint: string;
  fingerprintComponents: string[];
  confidence: number;
  signals: string[];
  notes: string[];
};

export type BackfillEventAssessment = {
  canCreate: boolean;
  isDuplicate: boolean;
  existingEventId: string | null;
  eventFingerprint: string;
  status: string;
  auctionType: "ONLINE" | "PHYSICAL" | "HYBRID" | "UNKNOWN";
  venueLabel: string | null;
  dateKind: "auction_date" | "not_supplied";
  auditStatus: BackfillAuditStatus;
  notes: string[];
};

export type BackfillRecordResult = {
  listingPropertyId: string;
  propertyMasterId: string | null;
  auctionEventId: string | null;
  identity: BackfillIdentityResult;
  event: BackfillEventAssessment;
  auditStatuses: BackfillAuditStatus[];
  pricingLinked: number;
  skipped: boolean;
  dryRun: boolean;
  /** Confirmed database write succeeded (execute mode only). */
  masterPersisted: boolean;
  eventPersisted: boolean;
  /** Would create on execute — dry-run projection only. */
  masterProposed: boolean;
  eventProposed: boolean;
  masterInserted: boolean;
  masterReused: boolean;
  eventInserted: boolean;
  eventReused: boolean;
  eventDuplicateSkipped: boolean;
};

export type BackfillSummary = {
  runId: string;
  dryRun: boolean;
  recordsScanned: number;
  /** Listings successfully linked to a master (insert or reuse). */
  mastersCreated: number;
  mastersProposed: number;
  /** New master rows inserted. */
  mastersInserted: number;
  /** Existing master reused via fingerprint/match. */
  mastersReused: number;
  mastersMatched: number;
  masterReview: number;
  masterSkipped: number;
  /** Listings linked to an auction event (insert or reuse). */
  eventsCreated: number;
  eventsProposed: number;
  /** New auction_event rows inserted. */
  eventsInserted: number;
  /** Existing event reused (identity attach or external key). */
  eventsReused: number;
  eventsMatched: number;
  eventReview: number;
  eventSkipped: number;
  /** @deprecated use eventsDuplicatesSkipped — kept for run row compat */
  duplicatesSkipped: number;
  eventsDuplicatesSkipped: number;
  identityConflicts: number;
  insufficientEvidence: number;
  pricingLinked: number;
  locationReview: number;
  sourceBreakdown: Record<string, number>;
  schemaAvailable: boolean;
};
