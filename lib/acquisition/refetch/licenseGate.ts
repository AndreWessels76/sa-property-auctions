import {
  evaluatePublicDisplayPermission,
  type PartnerLicenceRecord,
  type LicenceGateResult,
} from "@/lib/acquisition/licensing";

/**
 * Fetch permission — stricter than display when licence missing.
 * Env allow for BC public fetch is an operational override already used in cron.
 */
export function evaluateFetchPermission(input: {
  licence: PartnerLicenceRecord | null;
  connectorId: string;
  envAllowPublicFetch?: boolean;
}): LicenceGateResult {
  const { licence, connectorId, envAllowPublicFetch } = input;

  if (licence) {
    const display = evaluatePublicDisplayPermission(licence);
    if (!display.allowed) {
      return {
        allowed: false,
        reasons: display.reasons.map((r) => `Licence: ${r}`),
      };
    }
    // Active licence with display permission implies fetch of own listing URLs
    return { allowed: true, reasons: [] };
  }

  // No DB licence — only known operational override for Bidders Choice
  if (
    connectorId === "bidders_choice" &&
    envAllowPublicFetch === true
  ) {
    return {
      allowed: true,
      reasons: ["Operational env allow: BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH"],
    };
  }

  return {
    allowed: false,
    reasons: ["No active partner licence — live fetch blocked"],
  };
}

export type BcFetchEligibilityState =
  | "LICENSE_ACTIVE"
  | "PUBLIC_FETCH_ALLOWED"
  | "LICENSE_BLOCKED"
  | "CONFIG_MISSING"
  | "SOURCE_UNAVAILABLE";

/**
 * Diagnostic classification for Bidders Choice fetch eligibility.
 * Does not perform network I/O.
 */
export function classifyBcFetchEligibility(input: {
  connectorId: string;
  sourceUrl?: string | null;
  licence: PartnerLicenceRecord | null;
  envAllowPublicFetch?: boolean | null;
}): {
  state: BcFetchEligibilityState;
  allowed: boolean;
  reasons: string[];
} {
  if (!input.sourceUrl?.trim()) {
    return {
      state: "SOURCE_UNAVAILABLE",
      allowed: false,
      reasons: ["Missing source URL"],
    };
  }

  const envAllow = input.envAllowPublicFetch === true;
  const gate = evaluateFetchPermission({
    licence: input.licence,
    connectorId: input.connectorId,
    envAllowPublicFetch: envAllow,
  });

  if (gate.allowed && input.licence) {
    return { state: "LICENSE_ACTIVE", allowed: true, reasons: gate.reasons };
  }
  if (gate.allowed && envAllow) {
    return {
      state: "PUBLIC_FETCH_ALLOWED",
      allowed: true,
      reasons: gate.reasons,
    };
  }
  if (
    input.connectorId === "bidders_choice" &&
    !input.licence &&
    input.envAllowPublicFetch !== true
  ) {
    return {
      state: "CONFIG_MISSING",
      allowed: false,
      reasons: [
        ...(gate.reasons ?? []),
        "BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH is not true and no partner_licences row is active",
      ],
    };
  }
  return {
    state: "LICENSE_BLOCKED",
    allowed: false,
    reasons: gate.reasons,
  };
}
