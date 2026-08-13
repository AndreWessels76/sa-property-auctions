import { randomUUID } from "node:crypto";
import {
  corpusFromProperty,
  EXTRACTION_VERSION,
  runDueDiligenceExtraction,
  type ExtractionResult,
} from "@/lib/dueDiligence/extraction";
import { evaluateFetchPermission } from "./licenseGate";
import { evaluateRobotsGate } from "./robotsGate";
import {
  intervalForPriority,
  refetchPriority,
  resolveFetchPolicy,
} from "./fetchPolicy";
import {
  extractHtmlTitle,
  fetchSourcePage,
  htmlToPlainText,
} from "./sourceFetcher";
import { sha256Content, SourceSnapshotService } from "./sourceSnapshotService";
import {
  detectDocumentUrlChanges,
  detectExtractionChanges,
  summarizeChangeClasses,
} from "./sourceChangeDetector";
import { RefetchAudit } from "./refetchAudit";
import { persistRefetchExtraction } from "./refetchExtractionLinkage";
import {
  decideChangeFromContentHash,
  shouldCreateSnapshot,
} from "./forceSemantics";
import {
  FETCHER_VERSION,
  type ChangeClass,
  type FetchPolicy,
  type FieldChange,
  type RefetchRunResult,
  type SourceHealthState,
} from "./types";
import type { PartnerLicenceRecord } from "@/lib/acquisition/licensing";
import { LoggerService } from "@/lib/logger";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

export type RefetchPropertyInput = {
  property: PropertyDTO;
  connectorId?: string;
  partnerCode?: string | null;
  licence?: PartnerLicenceRecord | null;
  force?: boolean;
  operator?: string | null;
  policyOverrides?: Partial<FetchPolicy>;
  /** Previous extraction JSON for comparison (optional). */
  previousExtraction?: ExtractionResult | null;
};

function connectorForProperty(property: PropertyDTO): string {
  const src = `${property.source ?? ""} ${property.source_name ?? ""}`.toLowerCase();
  if (src.includes("bidder")) return "bidders_choice";
  return "bidders_choice"; // only licensed live path in this release
}

/**
 * Core re-fetch orchestration for one property source URL.
 */
export async function refetchPropertySource(
  input: RefetchPropertyInput,
): Promise<RefetchRunResult> {
  const started = Date.now();
  const runCode = `rf_${randomUUID().slice(0, 10)}`;
  const property = input.property;
  const sourceUrl = property.source_url?.trim() || null;
  const connectorId = input.connectorId ?? connectorForProperty(property);
  const policy = resolveFetchPolicy(input.policyOverrides);

  const base: RefetchRunResult = {
    runCode,
    status: "started",
    propertyId: property.id,
    connectorId,
    sourceUrl,
    httpStatus: null,
    contentHash: null,
    previousHash: null,
    changed: false,
    changeClasses: [],
    fieldChanges: [],
    conflicts: 0,
    fieldsChanged: 0,
    extractionFieldsFound: 0,
    extractionRunId: null,
    snapshotId: null,
    forced: input.force === true,
    error: null,
    durationMs: 0,
    health: "UNKNOWN",
    message: "",
  };

  const finish = async (
    partial: Partial<RefetchRunResult>,
  ): Promise<RefetchRunResult> => {
    const result: RefetchRunResult = {
      ...base,
      ...partial,
      durationMs: Date.now() - started,
    };
    await RefetchAudit.recordRun({
      run_code: result.runCode,
      property_id: result.propertyId,
      partner_code: input.partnerCode ?? property.source_name,
      connector_id: result.connectorId,
      source_url: result.sourceUrl,
      operator: input.operator ?? "system",
      status: result.status,
      http_status: result.httpStatus,
      content_hash: result.contentHash,
      previous_hash: result.previousHash,
      changed: result.changed,
      change_classes: result.changeClasses,
      fields_changed: result.fieldsChanged,
      conflicts: result.conflicts,
      extraction_run_id: result.extractionRunId ?? undefined,
      error: result.error,
      started_at: new Date(started).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: result.durationMs,
      meta: {
        health: result.health,
        message: result.message,
        snapshotId: result.snapshotId,
        extractionRunId: result.extractionRunId,
        forced: result.forced,
      },
    });
    LoggerService.audit("source.refetch.run", {
      runCode: result.runCode,
      status: result.status,
      propertyId: result.propertyId,
      changed: result.changed,
      conflicts: result.conflicts,
      forced: result.forced,
    });
    return result;
  };

  if (!sourceUrl) {
    return finish({
      status: "SKIPPED_NO_URL",
      health: "UNKNOWN",
      message: "Property has no source URL — cannot re-fetch",
      error: "No source URL",
    });
  }

  // Licence gate
  const licenceGate = evaluateFetchPermission({
    licence: input.licence ?? null,
    connectorId,
    envAllowPublicFetch: process.env.BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH === "true",
  });
  if (!licenceGate.allowed) {
    return finish({
      status: "SKIPPED_LICENSE",
      health: "LICENSE_EXPIRED",
      message: licenceGate.reasons.join("; ") || "License blocked",
      error: "SKIPPED_LICENSE",
    });
  }

  // Interval / cache gate
  const previous = await SourceSnapshotService.latestForProperty(property.id);
  const previousHash = previous?.content_hash ?? null;
  if (!input.force && previous?.fetched_at) {
    const priority = refetchPriority({
      listingStatus: property.listing_status ?? property.status,
      auctionDate: property.auction_date,
    });
    const minInterval = intervalForPriority(priority);
    const age = Date.now() - new Date(previous.fetched_at).getTime();
    if (age < minInterval) {
      return finish({
        status: "SKIPPED_INTERVAL",
        previousHash,
        contentHash: previousHash,
        health: "HEALTHY",
        message: `Skipped — last fetch within interval (${Math.round(age / 60000)}m ago)`,
      });
    }
  }

  // Concurrency lock
  const lockKey = `url:${sourceUrl}`;
  const locked = await RefetchAudit.acquireLock(lockKey, runCode);
  if (!locked) {
    return finish({
      status: "SKIPPED_LOCK",
      previousHash,
      health: "DEGRADED",
      message: "Skipped — another worker is fetching this source",
    });
  }

  try {
    // Robots gate
    const robots = await evaluateRobotsGate({ sourceUrl, policy });
    if (!robots.allowed) {
      return finish({
        status: "SKIPPED_ROBOTS",
        previousHash,
        health: "ROBOTS_BLOCKED",
        message: robots.reason,
        error: "SKIPPED_ROBOTS",
        changeClasses: ["SOURCE_UNAVAILABLE"],
      });
    }

    const fetchResult = await fetchSourcePage({ url: sourceUrl, policy });

    // 304 Not Modified — treat as no-change; do not duplicate snapshot
    if (fetchResult.status === 304) {
      return finish({
        status: "no_change",
        httpStatus: 304,
        contentHash: previousHash,
        previousHash,
        changed: false,
        changeClasses: ["NO_CHANGE"],
        snapshotId: previous?.id ?? null,
        health: "HEALTHY",
        message: "NO_CHANGE — HTTP 304 Not Modified; extraction skipped",
      });
    }

    if (!fetchResult.ok || !fetchResult.body) {
      const unavailable =
        fetchResult.status === 404 ||
        fetchResult.status === 403 ||
        fetchResult.status === 410;
      return finish({
        status: unavailable ? "source_unavailable" : "failed",
        httpStatus: fetchResult.status || null,
        previousHash,
        health: unavailable ? "SOURCE_UNAVAILABLE" : "ERROR",
        message: unavailable
          ? `SOURCE_UNAVAILABLE — HTTP ${fetchResult.status} (property retained; not auto-removed)`
          : fetchResult.error ?? "Fetch failed",
        error: fetchResult.error,
        changeClasses: unavailable ? ["SOURCE_UNAVAILABLE"] : [],
      });
    }

    const plain = htmlToPlainText(fetchResult.body);
    const title = extractHtmlTitle(fetchResult.body);
    const hashBasis = `${fetchResult.finalUrl}\n${title ?? ""}\n${plain}`;
    const contentHash = sha256Content(hashBasis);

    const hashDecision = decideChangeFromContentHash({
      previousHash,
      contentHash,
      force: input.force === true,
    });

    // Identical content — audit the fetch, never duplicate snapshot or re-extract.
    // force skips interval only; it never pretends the source changed.
    if (!shouldCreateSnapshot(hashDecision)) {
      const existing =
        previous?.id ??
        (await SourceSnapshotService.findByUrlAndHash(sourceUrl, contentHash))
          ?.id ??
        null;
      return finish({
        status: "no_change",
        httpStatus: fetchResult.status,
        contentHash,
        previousHash,
        changed: false,
        changeClasses: ["NO_CHANGE"],
        snapshotId: existing,
        extractionRunId: null,
        health: "HEALTHY",
        message: input.force
          ? "NO_CHANGE — forced fetch completed; content hash unchanged; extraction skipped"
          : "NO_CHANGE — content hash unchanged; extraction skipped",
      });
    }

    // URL + hash already stored — never insert a duplicate content snapshot.
    const existingSame = await SourceSnapshotService.findByUrlAndHash(
      sourceUrl,
      contentHash,
    );
    if (existingSame?.id) {
      return finish({
        status: "no_change",
        httpStatus: fetchResult.status,
        contentHash,
        previousHash,
        changed: false,
        changeClasses: ["NO_CHANGE"],
        snapshotId: existingSame.id,
        extractionRunId: null,
        health: "HEALTHY",
        message: input.force
          ? "NO_CHANGE — forced fetch completed; identical content snapshot already exists"
          : "NO_CHANGE — identical content snapshot already exists",
      });
    }

    // Changed — run deterministic DD extraction with page text
    const extraction = runDueDiligenceExtraction(
      corpusFromProperty({
        ...property,
        agricultural_details: property.agricultural_details as Record<
          string,
          unknown
        > | null,
        source_page_text: plain,
      }),
    );

    let previousExtraction = input.previousExtraction ?? null;
    if (!previousExtraction && previous?.source_text) {
      previousExtraction = runDueDiligenceExtraction(
        corpusFromProperty({
          ...property,
          description: previous.source_text.slice(0, 5000),
          agricultural_details: property.agricultural_details as Record<
            string,
            unknown
          > | null,
          source_page_text: previous.source_text,
        }),
      );
    }

    const fieldChanges: FieldChange[] = detectExtractionChanges(
      previousExtraction,
      extraction,
    );

    const prevDocs =
      previousExtraction?.documents.map((d) => d.url).filter(Boolean) ?? [];
    const nextDocs = extraction.documents.map((d) => d.url).filter(Boolean);
    fieldChanges.push(...detectDocumentUrlChanges(prevDocs, nextDocs));

    const changeClasses = summarizeChangeClasses(fieldChanges);
    if (changeClasses.length === 1 && changeClasses[0] === "NO_CHANGE") {
      changeClasses.length = 0;
      changeClasses.push("CONTENT_CHANGED");
    }

    const conflicts = fieldChanges.filter((c) => c.outcome === "CONFLICT").length;
    const fieldsChanged = fieldChanges.filter(
      (c) => c.outcome === "UPDATED" || c.outcome === "NEW" || c.outcome === "REMOVED",
    ).length;

    const storeRaw =
      policy.storeRawHtml &&
      (input.licence?.document_usage_rights === true ||
        process.env.BIDDERS_CHOICE_STORE_RAW_HTML === "true");

    const snapshotId = await SourceSnapshotService.insert({
      property_id: property.id,
      partner_code: input.partnerCode ?? property.source_name,
      connector_id: connectorId,
      source_url: sourceUrl,
      canonical_url: fetchResult.finalUrl,
      http_status: fetchResult.status,
      fetched_at: new Date().toISOString(),
      content_type: fetchResult.contentType,
      content_length: fetchResult.bytes,
      content_hash: contentHash,
      previous_hash: previousHash,
      source_title: title,
      source_text: policy.storeText ? plain.slice(0, 100_000) : null,
      raw_html: storeRaw ? fetchResult.body.slice(0, policy.maxResponseBytes) : null,
      store_raw_html: Boolean(storeRaw),
      extraction_version: EXTRACTION_VERSION,
      fetcher_version: FETCHER_VERSION,
      change_class: changeClasses[0] ?? "CONTENT_CHANGED",
      meta: {
        fieldChanges: fieldChanges.slice(0, 50),
        extractionStats: extraction.stats,
        conflicts,
      },
    });

    const persisted = await persistRefetchExtraction({
      property,
      sourcePageText: plain,
      operator: input.operator ?? "system",
      snapshotId,
      contentHash,
      refetchRunCode: runCode,
      fieldChanges,
    });

    const message =
      conflicts > 0
        ? `Source changed with ${conflicts} verified conflict(s) — admin review required (verified values not overwritten)`
        : `Source changed — ${fieldsChanged} field update(s); extraction persisted (not auto-verified)`;

    return finish({
      status: "completed",
      httpStatus: fetchResult.status,
      contentHash,
      previousHash,
      changed: true,
      changeClasses: changeClasses as ChangeClass[],
      fieldChanges,
      conflicts,
      fieldsChanged,
      extractionFieldsFound: persisted.fieldsFound,
      extractionRunId: persisted.extractionRunId,
      snapshotId,
      health: conflicts > 0 ? "DEGRADED" : "HEALTHY",
      message,
    });
  } finally {
    await RefetchAudit.releaseLock(lockKey);
  }
}
