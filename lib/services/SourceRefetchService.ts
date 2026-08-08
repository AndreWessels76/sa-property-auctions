import "server-only";

import { PropertyService } from "@/lib/services/PropertyService";
import {
  PartnershipRepository,
  PartnerLicenceRepository,
} from "@/lib/repositories/PartnershipRepository";
import { LoggerService } from "@/lib/logger";
import {
  refetchPropertySource,
  type RefetchPropertyInput,
} from "@/lib/acquisition/refetch/sourceRefetchService";
import {
  selectUpcomingForRefetch,
  scheduleRefetchOrder,
} from "@/lib/acquisition/refetch/refetchScheduler";
import { RefetchAudit } from "@/lib/acquisition/refetch/refetchAudit";
import { SourceSnapshotService } from "@/lib/acquisition/refetch/sourceSnapshotService";
import { allowRate } from "@/lib/acquisition/refetch/rateLimiter";
import { resolveFetchPolicy } from "@/lib/acquisition/refetch/fetchPolicy";
import type {
  RefetchRunResult,
  SourceHealthState,
} from "@/lib/acquisition/refetch/types";
import type { PartnerLicenceRecord } from "@/lib/acquisition/licensing";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

export type BatchRefetchScope =
  | "property"
  | "partner"
  | "connector"
  | "upcoming"
  | "all_eligible";

export type BatchRefetchResult = {
  ok: boolean;
  scope: BatchRefetchScope;
  runId: string;
  processed: number;
  completed: number;
  noChange: number;
  skippedLicense: number;
  skippedRobots: number;
  skippedOther: number;
  unavailable: number;
  failed: number;
  changed: number;
  conflicts: number;
  results: RefetchRunResult[];
  message: string;
  durationMs: number;
};

function isBiddersChoiceProperty(p: PropertyDTO): boolean {
  const blob = `${p.source ?? ""} ${p.source_name ?? ""} ${p.source_url ?? ""}`.toLowerCase();
  return blob.includes("bidder") || (p.source_url ?? "").includes("bidderschoice");
}

async function resolveLicenceForProperty(
  property: PropertyDTO,
): Promise<{ licence: PartnerLicenceRecord | null; partnerCode: string | null }> {
  const partnerCode =
    property.source_name?.trim() ||
    (isBiddersChoiceProperty(property) ? "bidders_choice" : null);

  if (!partnerCode) {
    return { licence: null, partnerCode: null };
  }

  try {
    const partner =
      (await PartnershipRepository.getPartnerByCode(partnerCode)) ??
      (await PartnershipRepository.getPartnerByCode("bidders_choice"));
    if (!partner?.id) {
      return { licence: null, partnerCode };
    }
    const licences = await PartnerLicenceRepository.listByPartner(partner.id);
    const active =
      licences.find((l) => l.status === "active") ?? licences[0] ?? null;
    return { licence: active, partnerCode: partner.partner_code ?? partnerCode };
  } catch {
    return { licence: null, partnerCode };
  }
}

function domainKey(url: string | null): string {
  try {
    return url ? new URL(url).hostname.toLowerCase() : "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Live Source Re-fetch — admin/cron orchestration over existing acquisition + DD extraction.
 * Never auto-verifies. Never auto-publishes. Never silently overwrites VERIFIED fields.
 */
export class SourceRefetchService {
  static async refreshProperty(input: {
    propertyId: string;
    force?: boolean;
    operator?: string | null;
  }): Promise<RefetchRunResult> {
    const property = await PropertyService.getProperty(input.propertyId);
    if (!property) {
      return {
        runCode: `rf_missing`,
        status: "failed",
        propertyId: input.propertyId,
        connectorId: null,
        sourceUrl: null,
        httpStatus: null,
        contentHash: null,
        previousHash: null,
        changed: false,
        changeClasses: [],
        fieldChanges: [],
        conflicts: 0,
        fieldsChanged: 0,
        extractionFieldsFound: 0,
        snapshotId: null,
        error: "Property not found",
        durationMs: 0,
        health: "UNKNOWN",
        message: "Property not found",
      };
    }

    const { licence, partnerCode } = await resolveLicenceForProperty(property);
    const policy = resolveFetchPolicy();
    const rateOk =
      allowRate({
        key: `connector:bidders_choice`,
        maxPerMinute: policy.maxRequestsPerMinute,
      }) &&
      allowRate({
        key: `domain:${domainKey(property.source_url)}`,
        maxPerMinute: policy.maxRequestsPerMinute,
      });

    if (!rateOk && !input.force) {
      return {
        runCode: `rf_rate`,
        status: "SKIPPED_RATE",
        propertyId: property.id,
        connectorId: "bidders_choice",
        sourceUrl: property.source_url,
        httpStatus: null,
        contentHash: null,
        previousHash: null,
        changed: false,
        changeClasses: [],
        fieldChanges: [],
        conflicts: 0,
        fieldsChanged: 0,
        extractionFieldsFound: 0,
        snapshotId: null,
        error: "SKIPPED_RATE",
        durationMs: 0,
        health: "DEGRADED",
        message: "Skipped — rate limit",
      };
    }

    const payload: RefetchPropertyInput = {
      property,
      licence,
      partnerCode,
      force: input.force === true,
      operator: input.operator ?? "admin",
      connectorId: "bidders_choice",
    };

    return refetchPropertySource(payload);
  }

  static async refreshBatch(input: {
    scope: BatchRefetchScope;
    propertyId?: string;
    partnerCode?: string;
    connectorId?: string;
    limit?: number;
    force?: boolean;
    operator?: string | null;
  }): Promise<BatchRefetchResult> {
    const started = Date.now();
    const runId = `rf_batch_${Date.now().toString(36)}`;
    const limit = Math.min(Math.max(input.limit ?? 25, 1), 50);
    const force = input.force === true;
    const operator = input.operator ?? "system";

    let candidates: PropertyDTO[] = [];

    if (input.scope === "property") {
      if (!input.propertyId) {
        return {
          ok: false,
          scope: input.scope,
          runId,
          processed: 0,
          completed: 0,
          noChange: 0,
          skippedLicense: 0,
          skippedRobots: 0,
          skippedOther: 0,
          unavailable: 0,
          failed: 0,
          changed: 0,
          conflicts: 0,
          results: [],
          message: "propertyId required",
          durationMs: 0,
        };
      }
      const one = await PropertyService.getProperty(input.propertyId);
      candidates = one ? [one] : [];
    } else {
      const all = await PropertyService.getProperties();
      if (input.scope === "upcoming") {
        candidates = selectUpcomingForRefetch(
          all.filter(
            (p) =>
              isBiddersChoiceProperty(p) &&
              ["upcoming", "live"].includes(
                (p.listing_status ?? p.status ?? "").toLowerCase(),
              ),
          ),
          limit,
        );
      } else if (input.scope === "partner") {
        const code = (input.partnerCode ?? "bidders_choice").toLowerCase();
        candidates = scheduleRefetchOrder(
          all.filter((p) => {
            const blob = `${p.source_name ?? ""} ${p.source ?? ""}`.toLowerCase();
            return blob.includes(code.replace(/_/g, " ")) || blob.includes(code);
          }),
        ).slice(0, limit);
      } else if (input.scope === "connector") {
        // Only BC live path in this release
        candidates = selectUpcomingForRefetch(
          all.filter(isBiddersChoiceProperty),
          limit,
        );
      } else {
        candidates = selectUpcomingForRefetch(
          all.filter((p) => Boolean(p.source_url) && isBiddersChoiceProperty(p)),
          limit,
        );
      }
    }

    const results: RefetchRunResult[] = [];
    let completed = 0;
    let noChange = 0;
    let skippedLicense = 0;
    let skippedRobots = 0;
    let skippedOther = 0;
    let unavailable = 0;
    let failed = 0;
    let changed = 0;
    let conflicts = 0;

    for (const property of candidates) {
      const result = await this.refreshProperty({
        propertyId: property.id,
        force,
        operator,
      });
      results.push(result);

      if (result.status === "completed") {
        completed += 1;
        if (result.changed) changed += 1;
      } else if (result.status === "no_change") {
        noChange += 1;
      } else if (result.status === "SKIPPED_LICENSE") {
        skippedLicense += 1;
      } else if (result.status === "SKIPPED_ROBOTS") {
        skippedRobots += 1;
      } else if (
        result.status === "SKIPPED_RATE" ||
        result.status === "SKIPPED_INTERVAL" ||
        result.status === "SKIPPED_LOCK" ||
        result.status === "SKIPPED_NO_URL" ||
        result.status === "SKIPPED_CONNECTOR"
      ) {
        skippedOther += 1;
      } else if (result.status === "source_unavailable") {
        unavailable += 1;
      } else {
        failed += 1;
      }
      conflicts += result.conflicts;
    }

    const durationMs = Date.now() - started;
    const message =
      candidates.length === 0
        ? "No eligible sources found for this scope."
        : `Processed ${results.length}: ${changed} changed, ${noChange} unchanged, ${conflicts} conflicts, ${skippedLicense} license skips, ${skippedRobots} robots skips, ${unavailable} unavailable, ${failed} failed.`;

    LoggerService.audit("source.refetch.batch", {
      runId,
      scope: input.scope,
      processed: results.length,
      changed,
      conflicts,
      durationMs,
      operator,
    });

    return {
      ok: failed === 0 || completed + noChange > 0,
      scope: input.scope,
      runId,
      processed: results.length,
      completed,
      noChange,
      skippedLicense,
      skippedRobots,
      skippedOther,
      unavailable,
      failed,
      changed,
      conflicts,
      results,
      message,
      durationMs,
    };
  }

  static async queueRows(limit = 40) {
    const runs = await RefetchAudit.listRecent(limit);
    const properties = await PropertyService.getProperties().catch(() => []);
    const byId = new Map(properties.map((p) => [p.id, p]));

    return Promise.all(
      runs.map(async (run) => {
        const property = run.property_id
          ? byId.get(run.property_id) ?? null
          : null;
        const snap = run.property_id
          ? await SourceSnapshotService.latestForProperty(run.property_id)
          : null;
        const health = (run.meta?.health as SourceHealthState | undefined) ??
          deriveHealth(String(run.status));
        return {
          propertyId: run.property_id ?? null,
          title: property?.title ?? "(unknown)",
          partner: run.partner_code ?? property?.source_name ?? null,
          sourceUrl: run.source_url ?? property?.source_url ?? null,
          lastFetch: run.completed_at ?? run.started_at ?? null,
          lastChange: snap?.fetched_at && snap.change_class !== "NO_CHANGE"
            ? snap.fetched_at
            : null,
          status: run.status,
          fieldsUpdated: run.fields_changed ?? 0,
          documentsChanged: Array.isArray(run.change_classes)
            ? run.change_classes.filter((c) =>
                String(c).includes("DOCUMENT"),
              ).length
            : 0,
          conflicts: run.conflicts ?? 0,
          error: run.error ?? null,
          contentHash: run.content_hash ?? snap?.content_hash ?? null,
          previousHash: run.previous_hash ?? snap?.previous_hash ?? null,
          health,
          changeClasses: run.change_classes ?? [],
        };
      }),
    );
  }

  static async propertyRefreshStatus(propertyId: string) {
    const property = await PropertyService.getProperty(propertyId);
    const snap = await SourceSnapshotService.latestForProperty(propertyId);
    const { licence } = property
      ? await resolveLicenceForProperty(property)
      : { licence: null };

    return {
      propertyId,
      title: property?.title ?? null,
      sourceUrl: property?.source_url ?? null,
      lastFetched: snap?.fetched_at ?? null,
      lastChanged:
        snap && snap.change_class && snap.change_class !== "NO_CHANGE"
          ? snap.fetched_at
          : null,
      sourceStatus: snap?.change_class ?? "UNKNOWN",
      licenseStatus: licence?.status ?? "none",
      robotsStatus: "checked_at_fetch",
      currentHash: snap?.content_hash ?? null,
      previousHash: snap?.previous_hash ?? null,
      extractionVersion: snap?.extraction_version ?? null,
      storeRawHtml: snap?.store_raw_html ?? false,
    };
  }
}

function deriveHealth(status: string): SourceHealthState {
  if (status === "completed" || status === "no_change") return "HEALTHY";
  if (status === "SKIPPED_LICENSE") return "LICENSE_EXPIRED";
  if (status === "SKIPPED_ROBOTS") return "ROBOTS_BLOCKED";
  if (status === "source_unavailable") return "SOURCE_UNAVAILABLE";
  if (status === "failed") return "ERROR";
  if (status.startsWith("SKIPPED_")) return "DEGRADED";
  return "UNKNOWN";
}
