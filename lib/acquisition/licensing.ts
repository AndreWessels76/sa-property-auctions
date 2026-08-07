/**
 * Licensing & compliance — never publish beyond licence permissions.
 */

export type PartnerLicenceRecord = {
  id?: string;
  partner_id: string;
  licence_label: string;
  licence_expiry?: string | null;
  data_usage_rights?: string | null;
  copyright_restrictions?: string | null;
  attribution_rules?: string | null;
  public_display_permission: boolean;
  image_usage_rights: boolean;
  document_usage_rights: boolean;
  import_restrictions?: string | null;
  status: "draft" | "active" | "expired" | "revoked";
};

export type LicenceGateResult = {
  allowed: boolean;
  reasons: string[];
};

export function evaluatePublicDisplayPermission(
  licence: PartnerLicenceRecord | null,
  now = new Date(),
): LicenceGateResult {
  const reasons: string[] = [];
  if (!licence) {
    return {
      allowed: false,
      reasons: ["No licence on file — public display blocked"],
    };
  }
  if (licence.status === "revoked") {
    reasons.push("Licence revoked");
  }
  if (licence.status === "draft") {
    reasons.push("Licence still draft");
  }
  if (licence.status === "expired") {
    reasons.push("Licence marked expired");
  }
  if (licence.licence_expiry) {
    const exp = new Date(licence.licence_expiry);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < now.getTime()) {
      reasons.push("Licence expiry date passed");
    }
  }
  if (!licence.public_display_permission) {
    reasons.push("Public display not permitted by agreement");
  }
  return { allowed: reasons.length === 0, reasons };
}

export function daysUntilLicenceExpiry(
  licence: PartnerLicenceRecord | null,
  now = new Date(),
): number | null {
  if (!licence?.licence_expiry) return null;
  const exp = new Date(licence.licence_expiry);
  if (Number.isNaN(exp.getTime())) return null;
  return Math.round(
    (exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
  );
}

export const ONBOARDING_STEPS = [
  "company",
  "agreement",
  "connector",
  "field_mapping",
  "sample_validation",
  "identity_test",
  "import_test",
  "verification_test",
  "approval",
  "production_enable",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
