/**
 * Single Source of Truth — field provenance with source precedence.
 * Conflicting values are recorded; higher precedence wins for "current".
 */

export type ProvenanceRecord = {
  property_master_id: string;
  field_name: string;
  field_value: string | null;
  source_name: string | null;
  source_url?: string | null;
  verification_date?: string | null;
  verifier?: string | null;
  confidence?: number | null;
  precedence: number;
  last_updated_at?: string;
};

/** Higher = preferred. Verified admin beats connector import. */
export const SOURCE_PRECEDENCE: Record<string, number> = {
  admin_verified: 100,
  manual_verification: 90,
  geocode_verified: 80,
  connector_bidders_choice: 50,
  connector_import: 40,
  enrichment_derived: 20,
  unknown: 10,
};

export function resolveSourcePrecedence(sourceName: string | null | undefined): number {
  if (!sourceName?.trim()) return SOURCE_PRECEDENCE.unknown;
  const key = sourceName.trim().toLowerCase().replace(/\s+/g, "_");
  if (key in SOURCE_PRECEDENCE) return SOURCE_PRECEDENCE[key]!;
  if (key.includes("bidders")) return SOURCE_PRECEDENCE.connector_bidders_choice;
  if (key.includes("admin") || key.includes("verif")) {
    return SOURCE_PRECEDENCE.manual_verification;
  }
  if (key.includes("enrich")) return SOURCE_PRECEDENCE.enrichment_derived;
  return SOURCE_PRECEDENCE.connector_import;
}

export function buildProvenanceRecords(input: {
  propertyMasterId: string;
  sourceName: string;
  sourceUrl?: string | null;
  verificationDate?: string | null;
  verifier?: string | null;
  confidence?: number | null;
  fields: Record<string, string | number | null | undefined>;
}): ProvenanceRecord[] {
  const precedence = resolveSourcePrecedence(input.sourceName);
  const now = new Date().toISOString();
  const out: ProvenanceRecord[] = [];
  for (const [field_name, raw] of Object.entries(input.fields)) {
    if (raw === undefined) continue;
    out.push({
      property_master_id: input.propertyMasterId,
      field_name,
      field_value: raw === null ? null : String(raw),
      source_name: input.sourceName,
      source_url: input.sourceUrl ?? null,
      verification_date: input.verificationDate ?? null,
      verifier: input.verifier ?? null,
      confidence: input.confidence ?? null,
      precedence,
      last_updated_at: now,
    });
  }
  return out;
}

/**
 * Pick winning value among provenance rows for a field.
 * Deterministic: highest precedence, then latest update.
 */
export function selectProvenanceWinner(
  rows: ProvenanceRecord[],
  fieldName: string,
): ProvenanceRecord | null {
  const candidates = rows.filter((r) => r.field_name === fieldName);
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => {
    if (b.precedence !== a.precedence) return b.precedence - a.precedence;
    return (b.last_updated_at ?? "").localeCompare(a.last_updated_at ?? "");
  })[0]!;
}
