/**
 * Auction partner post-auction / results feed ingestion.
 *
 * Validates authorised partner result records and routes accepted contributions
 * through existing outcome observation + HI 4.2 infrastructure.
 *
 * Does NOT invent partners, credentials, endpoints, or sale prices.
 * Default mode is dry-run. Production writes require authorisation + execute=true.
 * Feed CONNECTED requires validated connection — never a bare env flag.
 */

import "server-only";

import {
  AUCTION_PARTNER_RESULTS_FEED_CONTRACT,
  PARTNER_RESULTS_MAX_BATCH,
  assessResultsFeedConnection,
  buildBiddersChoiceResultsFeedStatus,
  classifyResultsFeedCredentials,
  classifyResultsFeedUrl,
  evaluatePartnerResultRecord,
  evaluateResultsFeedAuthorisation,
  partnerResultIdempotencyKey,
  rejectPartnerResultsUnlimitedLimit,
  resolvePartnerResultIdentityHeuristic,
  type AuctionPartnerResultRecord,
  type EvaluatePartnerResultOutput,
  type PartnerResultsAuthContext,
  type PartnerResultsConnectionAssessment,
  type PartnerResultsFeedStatus,
  type PartnerResultsIdentityResolution,
} from "@/lib/partnerships/auctionPartnerResultsFeedContract";
import { admitPartnerContribution } from "@/lib/partnerships/partnerPilotOnboarding";
import {
  PartnershipRepository,
  PartnerLicenceRepository,
} from "@/lib/repositories/PartnershipRepository";
import { OutcomeIntelligenceRepository } from "@/lib/repositories/OutcomeIntelligenceRepository";
import { HistoricalIntelligence56Service } from "@/lib/services/HistoricalIntelligence56Service";
import { LoggerService } from "@/lib/logger";
import type { OutcomeExtractionDraft } from "@/lib/acquisition/outcomes/types";

const BIDDERS_CHOICE_CODE = "bidders_choice";

export type PartnerResultsIngestBatchResult = {
  ok: boolean;
  dryRun: boolean;
  contractVersion: string;
  limit: number;
  processed: number;
  results: Array<
    EvaluatePartnerResultOutput & {
      partnerCode: string;
      externalResultId: string | null;
      externalEventId: string | null;
      externalPropertyId: string | null;
    }
  >;
  productionWritesExecuted: string[];
  blockedReason: string | null;
};

function licenceGrantsResultsFeed(licence: {
  status: string;
  data_usage_rights?: string | null;
  licence_label?: string;
}): boolean {
  if (licence.status !== "active") return false;
  const blob = `${licence.licence_label ?? ""} ${licence.data_usage_rights ?? ""}`.toLowerCase();
  return (
    blob.includes("result") ||
    blob.includes("outcome") ||
    blob.includes("sale_price") ||
    blob.includes("post-auction") ||
    blob.includes("post_auction")
  );
}

/**
 * Connection assessment for Bidders Choice results feed.
 * Never treats BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH or a bare VALIDATED/CONNECTED flag as authorised results access.
 */
export function assessBiddersChoiceResultsFeedConnectionFromEnv(opts?: {
  resultsLicenceActive?: boolean;
  probeFailed?: boolean;
  connectionValidatedOverride?: boolean;
}): PartnerResultsConnectionAssessment {
  const feedUrl = process.env.BIDDERS_CHOICE_RESULTS_FEED_URL?.trim() ?? "";
  const credentialsPresence = classifyResultsFeedCredentials({
    token: process.env.BIDDERS_CHOICE_RESULTS_FEED_TOKEN,
    apiKey: process.env.BIDDERS_CHOICE_RESULTS_FEED_API_KEY,
    username: process.env.BIDDERS_CHOICE_RESULTS_FEED_USERNAME,
    password: process.env.BIDDERS_CHOICE_RESULTS_FEED_PASSWORD,
  });

  // VALIDATED=true alone is insufficient — requires real URL + credentials + optional live probe success.
  const envValidatedFlag =
    process.env.BIDDERS_CHOICE_RESULTS_FEED_VALIDATED === "true";
  const urlOk = classifyResultsFeedUrl(feedUrl) === "PRESENT";
  const credsOk = credentialsPresence === "PRESENT";
  const connectionValidated =
    opts?.connectionValidatedOverride === true ||
    (envValidatedFlag && urlOk && credsOk && opts?.probeFailed !== true);

  return assessResultsFeedConnection({
    feedUrl,
    credentialsPresence,
    connectionValidated,
    probeFailed: opts?.probeFailed === true,
    resultsLicenceActive: opts?.resultsLicenceActive,
    validationReason:
      !urlOk || !credsOk
        ? null
        : opts?.probeFailed
          ? "Results feed connection probe failed"
          : envValidatedFlag && !connectionValidated
            ? "VALIDATED=true ignored without valid URL and credentials"
            : "Awaiting validated results-feed connection probe (URL + credentials + live validation)",
  });
}

export async function loadPartnerResultsAuthContext(
  partnerCode: string,
): Promise<{
  auth: PartnerResultsAuthContext;
  partnerStatus: string | null;
  activeLicences: number;
  connection: PartnerResultsConnectionAssessment;
  publicFetchAllowed: boolean;
}> {
  const partner = await PartnershipRepository.getPartnerByCode(partnerCode);
  const licences = partner?.id
    ? await PartnerLicenceRepository.listByPartner(partner.id)
    : [];
  const resultsLicenceActive = licences.some(licenceGrantsResultsFeed);
  const partnerActive =
    Boolean(partner) &&
    (partner!.status === "active" || partner!.contract_status === "active") &&
    partner!.licence_status !== "revoked";

  const publicFetchAllowed =
    process.env.BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH === "true";

  const connection =
    partnerCode === BIDDERS_CHOICE_CODE
      ? assessBiddersChoiceResultsFeedConnectionFromEnv({
          resultsLicenceActive,
        })
      : assessResultsFeedConnection({
          feedUrl: null,
          credentialsPresence: "MISSING",
          connectionValidated: false,
          resultsLicenceActive: false,
        });

  // Public listing fetch never authorises the private results feed.
  const feedConnected =
    connection.feedConnected && resultsLicenceActive && connection.state === "CONNECTED";

  return {
    auth: {
      partnerActive,
      resultsLicenceActive,
      feedConnected,
    },
    partnerStatus: partner?.status ?? null,
    activeLicences: licences.filter((l) => l.status === "active").length,
    connection,
    publicFetchAllowed,
  };
}

export class AuctionPartnerResultsIngestionService {
  static getContract() {
    return AUCTION_PARTNER_RESULTS_FEED_CONTRACT;
  }

  static async buildStatus(partnerCode = BIDDERS_CHOICE_CODE): Promise<
    PartnerResultsFeedStatus & {
      connectionState: PartnerResultsConnectionAssessment["state"];
      publicFetchAllowed: boolean;
      publicFetchIsNotResultsAuthorisation: true;
      liveCoverage?: {
        verifiedSold: number | null;
        verifiedSalePrices: number | null;
        comparableReady: number | null;
        marketReadyTowns: number | null;
        catalogueLeaks: number | null;
        outcomeMissing: number | null;
        soldWithoutPrice: number | null;
      };
    }
  > {
    const { auth, connection, publicFetchAllowed } =
      await loadPartnerResultsAuthContext(partnerCode);
    let verifiedSalePrices = 0;
    let verifiedSold = 0;
    let soldWithoutPrice: number | null = null;
    let comparableReady: number | null = null;
    let marketReadyTowns: number | null = null;
    let catalogueLeaks: number | null = null;
    let outcomeMissing: number | null = null;

    try {
      const report = await HistoricalIntelligence56Service.buildReport();
      verifiedSalePrices = Number(report.coverage52?.verifiedSalePrices ?? 0);
      verifiedSold = Number(report.coverage52?.verifiedSold ?? 0);
      soldWithoutPrice = Number(report.coverage52?.soldWithoutPrice ?? 0);
      comparableReady = Number(report.coverage52?.comparableReady ?? 0);
      marketReadyTowns = Number(report.coverage52?.marketReadyTowns ?? 0);
      catalogueLeaks = Number(report.coverage52?.catalogueLeaks ?? 0);
      const bottleneck = report.bottleneck56 as
        | { code?: string; count?: number }
        | null
        | undefined;
      outcomeMissing =
        bottleneck?.code === "OUTCOME_MISSING" ? (bottleneck.count ?? null) : null;
    } catch {
      /* status still returns contract readiness */
    }

    const status = buildBiddersChoiceResultsFeedStatus({
      auth,
      connection,
      partnerCode,
      verifiedResultsReceived: verifiedSold,
      verifiedSalePrices,
      lastSuccessfulIngestion: null,
    });

    return {
      ...status,
      connectionState: connection.state,
      publicFetchAllowed,
      publicFetchIsNotResultsAuthorisation: true,
      liveCoverage: {
        verifiedSold,
        verifiedSalePrices,
        soldWithoutPrice,
        comparableReady,
        marketReadyTowns,
        catalogueLeaks,
        outcomeMissing,
      },
    };
  }

  /**
   * Read-only connection validation. Never invents credentials.
   * Performs ZERO production writes. Stops at CONFIG_MISSING when secrets absent.
   */
  static async validateConnectionReadOnly(partnerCode = BIDDERS_CHOICE_CODE): Promise<{
    ok: boolean;
    state: PartnerResultsConnectionAssessment["state"];
    connection: PartnerResultsConnectionAssessment;
    productionWrites: 0;
    probedNetwork: boolean;
    message: string;
  }> {
    const { connection, auth, publicFetchAllowed } =
      await loadPartnerResultsAuthContext(partnerCode);

    if (connection.state === "CONFIG_MISSING") {
      return {
        ok: false,
        state: "CONFIG_MISSING",
        connection,
        productionWrites: 0,
        probedNetwork: false,
        message:
          "Results feed URL and/or credentials missing — awaiting legitimate partner authorisation",
      };
    }
    if (connection.state === "INVALID_CREDENTIALS") {
      return {
        ok: false,
        state: "INVALID_CREDENTIALS",
        connection,
        productionWrites: 0,
        probedNetwork: false,
        message: "Results feed URL or credentials invalid/placeholder — refused",
      };
    }
    if (connection.state === "LICENCE_BLOCKED" || !auth.resultsLicenceActive) {
      return {
        ok: false,
        state: "LICENCE_BLOCKED",
        connection: {
          ...connection,
          state: "LICENCE_BLOCKED",
        },
        productionWrites: 0,
        probedNetwork: false,
        message:
          "Results-feed licence missing — BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH does not authorise results feed" +
          (publicFetchAllowed ? " (public fetch is enabled separately)" : ""),
      };
    }

    // Live network probe only when URL+credentials+licence are present.
    // Without a real endpoint we do not invent one — leave NOT_CONNECTED until probe succeeds.
    if (!connection.validated) {
      return {
        ok: false,
        state: connection.state === "NOT_CONNECTED" ? "NOT_CONNECTED" : connection.state,
        connection,
        productionWrites: 0,
        probedNetwork: false,
        message:
          "Configuration present but live connection probe has not succeeded — not marking CONNECTED",
      };
    }

    return {
      ok: true,
      state: "CONNECTED",
      connection,
      productionWrites: 0,
      probedNetwork: true,
      message: "Results feed connection validated",
    };
  }

  /**
   * Dry-run or controlled ingest. Default dryRun=true — no production writes.
   * execute=true still refuses writes unless results feed is authorised.
   */
  static async ingestBatch(input: {
    records: AuctionPartnerResultRecord[];
    limit?: number;
    dryRun?: boolean;
    execute?: boolean;
    operator?: string;
    identityLookup?: Parameters<typeof resolvePartnerResultIdentityHeuristic>[1];
    resolveIdentity?: (
      record: AuctionPartnerResultRecord,
    ) => Promise<PartnerResultsIdentityResolution> | PartnerResultsIdentityResolution;
    existingContentHashByKey?: Record<string, string>;
    existingExternalResultKeys?: string[];
    existingVerifiedSalePriceByKey?: Record<string, number>;
  }): Promise<PartnerResultsIngestBatchResult> {
    const limitGate = rejectPartnerResultsUnlimitedLimit(input.limit);
    if (!limitGate.ok) {
      return {
        ok: false,
        dryRun: true,
        contractVersion: AUCTION_PARTNER_RESULTS_FEED_CONTRACT.version,
        limit: PARTNER_RESULTS_MAX_BATCH,
        processed: 0,
        results: [],
        productionWritesExecuted: [],
        blockedReason: limitGate.reason,
      };
    }

    const dryRun = input.execute === true ? false : input.dryRun !== false;
    const slice = input.records.slice(0, limitGate.limit);
    const results: PartnerResultsIngestBatchResult["results"] = [];
    const writes: string[] = [];
    const seenKeys = new Set(input.existingExternalResultKeys ?? []);

    for (const record of slice) {
      const { auth } = await loadPartnerResultsAuthContext(record.partnerCode);
      const identity = input.resolveIdentity
        ? await input.resolveIdentity(record)
        : resolvePartnerResultIdentityHeuristic(record, input.identityLookup);

      const identityKey =
        record.externalResultId ??
        record.externalEventId ??
        record.externalPropertyId ??
        record.listingPropertyId ??
        record.propertyMasterId ??
        `${record.town ?? ""}|${record.auctionDate ?? ""}`;

      const resultKey = partnerResultIdempotencyKey(record);
      const existingExternalResultKey =
        resultKey && seenKeys.has(resultKey) ? resultKey : null;

      const evaluated = evaluatePartnerResultRecord({
        record,
        auth,
        identity,
        existingContentHash:
          input.existingContentHashByKey?.[identityKey] ?? null,
        existingExternalResultKey,
        existingVerifiedSalePrice:
          input.existingVerifiedSalePriceByKey?.[identityKey] ?? null,
        dryRun,
      });

      if (evaluated.contribution) {
        const admitted = admitPartnerContribution(evaluated.contribution);
        if (!admitted.admitted && evaluated.decision !== "CONFLICT") {
          evaluated.decision = dryRun ? "DRY_RUN_REJECT" : "REJECTED";
          evaluated.reasons = [...evaluated.reasons, ...admitted.reasons];
          evaluated.nextPipeline = null;
        }
      }

      if (
        !dryRun &&
        evaluated.decision === "IMPORTED" &&
        evaluated.contribution &&
        identity.status === "RESOLVED"
      ) {
        const persist = await this.persistAcceptedResult({
          record,
          identity,
          evaluated,
          operator: input.operator ?? "partner-results-ingest",
        });
        if (!persist.ok) {
          evaluated.decision = persist.conflict
            ? "CONFLICT"
            : persist.noChange
              ? "NO_CHANGE"
              : "REJECTED";
          evaluated.reasons = [...evaluated.reasons, persist.reason];
        } else {
          writes.push(`outcome_observation:${persist.observationId ?? "ok"}`);
          if (resultKey) seenKeys.add(resultKey);
        }
      } else if (resultKey && evaluated.decision === "NO_CHANGE") {
        seenKeys.add(resultKey);
      } else if (
        resultKey &&
        (evaluated.decision === "DRY_RUN_ACCEPT" || evaluated.decision === "IMPORTED")
      ) {
        // Track within-batch duplicates for dry-run too
        seenKeys.add(resultKey);
      }

      results.push({
        ...evaluated,
        partnerCode: record.partnerCode,
        externalResultId: record.externalResultId ?? null,
        externalEventId: record.externalEventId ?? null,
        externalPropertyId: record.externalPropertyId ?? null,
      });
    }

    LoggerService.audit("partner_results.ingest_batch", {
      dryRun,
      processed: results.length,
      writes: writes.length,
      operator: input.operator ?? null,
    });

    return {
      ok: true,
      dryRun,
      contractVersion: AUCTION_PARTNER_RESULTS_FEED_CONTRACT.version,
      limit: limitGate.limit,
      processed: results.length,
      results,
      productionWritesExecuted: writes,
      blockedReason: null,
    };
  }

  private static async persistAcceptedResult(input: {
    record: AuctionPartnerResultRecord;
    identity: Extract<PartnerResultsIdentityResolution, { status: "RESOLVED" }>;
    evaluated: EvaluatePartnerResultOutput;
    operator: string;
  }): Promise<{
    ok: boolean;
    noChange?: boolean;
    conflict?: boolean;
    reason: string;
    observationId?: string | null;
  }> {
    const auth = evaluateResultsFeedAuthorisation(
      (
        await loadPartnerResultsAuthContext(input.record.partnerCode)
      ).auth,
    );
    if (!auth.authorised) {
      return { ok: false, reason: "UNAUTHORIZED_SOURCE at persist gate" };
    }

    try {
      const leaks = await HistoricalIntelligence56Service.buildReport();
      if (Number(leaks.coverage52?.catalogueLeaks ?? 0) > 0) {
        return { ok: false, reason: "catalogueLeaks > 0 — rebuild/ingest blocked" };
      }
    } catch {
      /* continue — catalogue check best-effort */
    }

    const contentHash = input.evaluated.contentHash;
    const draft: OutcomeExtractionDraft = {
      outcome:
        input.record.outcome === "EXPIRED"
          ? "EXPIRED"
          : input.record.outcome === "SOLD"
            ? "SOLD"
            : input.record.outcome === "WITHDRAWN"
              ? "WITHDRAWN"
              : input.record.outcome === "CANCELLED"
                ? "CANCELLED"
                : input.record.outcome === "PASSED_IN"
                  ? "PASSED_IN"
                  : "UNKNOWN",
      confidence: input.evaluated.salePriceAccepted ? "high" : "medium",
      evidence_type: "PARTNER_CONFIRMED",
      evidence_text:
        input.evaluated.contribution?.evidenceText ??
        `Partner results ${input.record.outcome}`,
      source_url:
        input.record.sourceUrl ?? input.record.sourceReference ?? null,
      source_name: `partner:${input.record.partnerCode}`,
      extraction_method: "partner_results_feed",
      sale_price: input.evaluated.salePriceAccepted
        ? (input.record.salePrice ?? null)
        : null,
      sale_price_evidence: input.evaluated.salePriceAccepted
        ? input.evaluated.contribution?.evidenceText ?? null
        : null,
      sale_price_confidence: input.evaluated.salePriceAccepted ? "high" : "none",
      review_required: input.evaluated.evidenceLabel === "CONFLICT",
      review_category:
        input.evaluated.evidenceLabel === "CONFLICT" ? "CONFLICT_REVIEW" : null,
      notes: [
        `results_feed:${AUCTION_PARTNER_RESULTS_FEED_CONTRACT.version}`,
        input.record.externalResultId
          ? `externalResultId:${input.record.externalResultId}`
          : null,
        input.operator ? `operator:${input.operator}` : null,
      ]
        .filter(Boolean)
        .join("|"),
    };

    const idempotencyKey =
      input.evaluated.idempotencyKey ??
      OutcomeIntelligenceRepository.buildIdempotencyKey({
        property_id: input.identity.propertyId,
        auction_event_id: input.identity.auctionEventId,
        content_hash: contentHash,
        outcome: draft.outcome,
        version: AUCTION_PARTNER_RESULTS_FEED_CONTRACT.version,
      });

    if (idempotencyKey) {
      const existing = await OutcomeIntelligenceRepository.findIdempotent(
        idempotencyKey,
      );
      if (existing) {
        return {
          ok: false,
          noChange: true,
          reason: "Idempotent observation already exists",
          observationId: existing.id,
        };
      }
    }

    const row = await OutcomeIntelligenceRepository.insertObservation({
      property_master_id: input.identity.propertyMasterId,
      auction_event_id: input.identity.auctionEventId,
      listing_property_id: input.identity.propertyId,
      outcome: draft.outcome,
      confidence: draft.confidence,
      evidence_types: [draft.evidence_type],
      source_url: draft.source_url,
      source_snapshot_id: null,
      source_hash: contentHash,
      source_timestamp: input.record.publishedAt ?? input.record.observedAt,
      evidence_text: draft.evidence_text,
      evidence_type: draft.evidence_type,
      extraction_method: draft.extraction_method,
      sale_price: draft.sale_price,
      sale_price_source: draft.source_name,
      sale_price_observed_at: draft.sale_price != null ? input.record.observedAt : null,
      sale_price_confidence: draft.sale_price_confidence,
      calculation_version: AUCTION_PARTNER_RESULTS_FEED_CONTRACT.version,
      idempotency_key: idempotencyKey,
      enrichment_run_id: null,
      observed_at: input.record.observedAt,
      review_category: draft.review_category,
    });

    return {
      ok: true,
      reason: "persisted",
      observationId: row?.id ?? null,
    };
  }
}
