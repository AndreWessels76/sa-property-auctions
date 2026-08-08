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
