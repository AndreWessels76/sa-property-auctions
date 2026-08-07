import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import { normalizeVerificationState } from "@/lib/data/verificationStates";
import type { Property } from "@/lib/types/property";

/**
 * Data Governance — detect quality issues from verified production rows.
 * Never fabricates issue counts.
 */

export type GovernanceIssue = {
  code: string;
  severity: "high" | "medium" | "low";
  propertyId: string;
  title: string | null;
  detail: string;
};

export type GovernanceReport = {
  generatedAt: string;
  sampleSize: number;
  issues: GovernanceIssue[];
  summary: {
    duplicatesSuspect: number;
    missingFields: number;
    brokenImageHints: number;
    expiredStillVerified: number;
    conflictingInfo: number;
    outdatedListings: number;
  };
};

function missingRequired(p: Property): string[] {
  const missing: string[] = [];
  if (!p.title?.trim()) missing.push("title");
  if (!p.town?.trim()) missing.push("town");
  if (!p.province?.trim()) missing.push("province");
  if (!p.auction_date) missing.push("auction_date");
  if (!p.property_type?.trim()) missing.push("property_type");
  if (!p.source_url?.trim() && !p.external_listing_id?.trim()) {
    missing.push("source");
  }
  return missing;
}

export function buildGovernanceReport(rows: Property[], now = new Date()): GovernanceReport {
  const issues: GovernanceIssue[] = [];
  const byExternal = new Map<string, string[]>();
  const byFingerprintKey = new Map<string, string[]>();

  for (const p of rows) {
    const state = normalizeVerificationState(p.verification_state);
    if (state !== "verified" && state !== "sold" && state !== "expired") continue;

    const missing = missingRequired(p);
    if (missing.length) {
      issues.push({
        code: "missing_fields",
        severity: "high",
        propertyId: p.id,
        title: p.title,
        detail: `Missing: ${missing.join(", ")}`,
      });
    }

    if (p.external_listing_id?.trim()) {
      const key = `${p.connector_id ?? p.source_name ?? ""}:${p.external_listing_id.trim().toLowerCase()}`;
      const list = byExternal.get(key) ?? [];
      list.push(p.id);
      byExternal.set(key, list);
    }

    const fpKey = [
      p.town?.trim().toLowerCase() ?? "",
      p.province?.trim().toLowerCase() ?? "",
      p.street_address?.trim().toLowerCase() ?? p.address?.trim().toLowerCase() ?? "",
      p.erf_number?.trim().toLowerCase() ?? "",
      p.farm_number?.trim().toLowerCase() ?? "",
    ].join("|");
    if (fpKey.replace(/\|/g, "").length > 6) {
      const list = byFingerprintKey.get(fpKey) ?? [];
      list.push(p.id);
      byFingerprintKey.set(fpKey, list);
    }

    // Expired but still marked verified + past date → governance flag
    if (
      state === "verified" &&
      p.auction_date &&
      !isPubliclyActiveListing({
        verification_state: p.verification_state,
        data_classification: p.data_classification,
        listing_status: p.listing_status,
        status: p.status,
        auction_date: p.auction_date,
        now,
      })
    ) {
      issues.push({
        code: "expired_still_verified",
        severity: "medium",
        propertyId: p.id,
        title: p.title,
        detail: "Past auction date — should move to historical lifecycle",
      });
    }

    if (
      typeof p.estimated_value === "number" &&
      p.estimated_value > 0 &&
      typeof p.auction_price === "number" &&
      p.auction_price > 0 &&
      p.auction_price > p.estimated_value * 3
    ) {
      issues.push({
        code: "conflicting_info",
        severity: "low",
        propertyId: p.id,
        title: p.title,
        detail: "Auction price far above estimated value — review provenance",
      });
    }

    const imported = p.imported_at ? new Date(p.imported_at) : null;
    if (
      imported &&
      !Number.isNaN(imported.getTime()) &&
      now.getTime() - imported.getTime() > 180 * 24 * 60 * 60 * 1000 &&
      state === "verified"
    ) {
      issues.push({
        code: "outdated_listing",
        severity: "low",
        propertyId: p.id,
        title: p.title,
        detail: "Imported >180 days ago — confirm source freshness",
      });
    }
  }

  for (const [key, ids] of byExternal) {
    if (ids.length > 1) {
      for (const id of ids) {
        issues.push({
          code: "duplicate_external_id",
          severity: "high",
          propertyId: id,
          title: null,
          detail: `Duplicate external key ${key}`,
        });
      }
    }
  }

  for (const [, ids] of byFingerprintKey) {
    if (ids.length > 1) {
      for (const id of ids) {
        issues.push({
          code: "possible_duplicate_master",
          severity: "medium",
          propertyId: id,
          title: null,
          detail: `Possible duplicate address/cadastral cluster (${ids.length} listings)`,
        });
      }
    }
  }

  const count = (code: string) => issues.filter((i) => i.code === code).length;

  return {
    generatedAt: now.toISOString(),
    sampleSize: rows.length,
    issues,
    summary: {
      duplicatesSuspect:
        count("duplicate_external_id") + count("possible_duplicate_master"),
      missingFields: count("missing_fields"),
      brokenImageHints: 0, // image HEAD checks are async — reserved
      expiredStillVerified: count("expired_still_verified"),
      conflictingInfo: count("conflicting_info"),
      outdatedListings: count("outdated_listing"),
    },
  };
}
