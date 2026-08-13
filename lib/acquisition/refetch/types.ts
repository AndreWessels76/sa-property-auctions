/**
 * Live Source Re-fetch — shared types.
 * Never fabricate. Never auto-verify. Never auto-publish.
 */

export const FETCHER_VERSION = "1.0.0";

export type RefetchSkipReason =
  | "SKIPPED_LICENSE"
  | "SKIPPED_ROBOTS"
  | "SKIPPED_RATE"
  | "SKIPPED_INTERVAL"
  | "SKIPPED_LOCK"
  | "SKIPPED_NO_URL"
  | "SKIPPED_CONNECTOR";

export type RefetchStatus =
  | "started"
  | "completed"
  | "failed"
  | "no_change"
  | "source_unavailable"
  | RefetchSkipReason;

export type ChangeClass =
  | "NO_CHANGE"
  | "CONTENT_CHANGED"
  | "AUCTION_DATE_CHANGED"
  | "AUCTION_STATUS_CHANGED"
  | "PROPERTY_DATA_CHANGED"
  | "LAND_DATA_CHANGED"
  | "DOCUMENT_ADDED"
  | "DOCUMENT_REMOVED"
  | "IMAGE_CHANGED"
  | "AGENCY_CHANGED"
  | "LEGAL_DATA_CHANGED"
  | "SOURCE_REMOVED"
  | "SOURCE_UNAVAILABLE"
  | "SOURCE_VALUE_REMOVED"
  | "CONFLICT_REVIEW_REQUIRED";

export type SourceHealthState =
  | "HEALTHY"
  | "DEGRADED"
  | "BLOCKED"
  | "LICENSE_EXPIRED"
  | "ROBOTS_BLOCKED"
  | "SOURCE_UNAVAILABLE"
  | "ERROR"
  | "UNKNOWN";

export type FetchPolicy = {
  minIntervalMs: number;
  maxRequestsPerMinute: number;
  maxConcurrent: number;
  timeoutMs: number;
  maxRetries: number;
  backoffMs: number;
  userAgent: string;
  maxResponseBytes: number;
  allowedContentTypes: string[];
  allowedHosts: string[];
  storeRawHtml: boolean;
  storeText: boolean;
};

export type SourceSnapshotRecord = {
  id?: string;
  property_id: string | null;
  partner_code: string | null;
  connector_id: string;
  source_url: string;
  canonical_url: string | null;
  http_status: number | null;
  fetched_at: string;
  content_type: string | null;
  content_length: number | null;
  content_hash: string;
  previous_hash: string | null;
  source_title: string | null;
  source_text: string | null;
  raw_html: string | null;
  store_raw_html: boolean;
  extraction_version: string | null;
  fetcher_version: string;
  change_class: string | null;
  meta?: Record<string, unknown>;
};

export type FieldChangeOutcome =
  | "NEW"
  | "UNCHANGED"
  | "UPDATED"
  | "REMOVED"
  | "CONFLICT";

export type FieldChange = {
  field: string;
  previous: string | number | boolean | null;
  next: string | number | boolean | null;
  outcome: FieldChangeOutcome;
  previousVerification?: string | null;
  changeClass: ChangeClass;
};

export type RefetchRunResult = {
  runCode: string;
  status: RefetchStatus;
  propertyId: string | null;
  connectorId: string | null;
  sourceUrl: string | null;
  httpStatus: number | null;
  contentHash: string | null;
  previousHash: string | null;
  changed: boolean;
  changeClasses: ChangeClass[];
  fieldChanges: FieldChange[];
  conflicts: number;
  fieldsChanged: number;
  extractionFieldsFound: number;
  extractionRunId: string | null;
  snapshotId: string | null;
  /** True when the caller skipped interval/eligibility — never means "treat as changed". */
  forced: boolean;
  error: string | null;
  durationMs: number;
  health: SourceHealthState;
  message: string;
};

export const DEFAULT_FETCH_POLICY: FetchPolicy = {
  minIntervalMs: 6 * 60 * 60 * 1000, // 6h for high-priority upcoming
  maxRequestsPerMinute: 6,
  maxConcurrent: 2,
  timeoutMs: 20_000,
  maxRetries: 2,
  backoffMs: 1_500,
  userAgent:
    "SAPropertyAuctionsBot/1.0 (+https://sa-property-auctions.vercel.app; source-refetch)",
  maxResponseBytes: 2_000_000,
  allowedContentTypes: ["text/html", "application/xhtml+xml", "text/plain"],
  allowedHosts: [
    "www.bidderschoice.co.za",
    "bidderschoice.co.za",
  ],
  storeRawHtml: false, // default: text-only unless licence allows
  storeText: true,
};
