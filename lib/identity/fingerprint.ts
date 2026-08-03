/**
 * Deterministic property fingerprint — Property Identity Engine.
 * Never invents missing identity fields; only hashes what is known.
 */

export type FingerprintInput = {
  latitude?: number | null;
  longitude?: number | null;
  streetAddress?: string | null;
  farmName?: string | null;
  farmNumber?: string | null;
  erfNumber?: string | null;
  portionNumber?: string | null;
  title?: string | null;
  town?: string | null;
  province?: string | null;
  landSizeSqm?: number | null;
  combinedExtent?: string | null;
  primaryImageHash?: string | null;
  externalReferences?: Array<string | null | undefined>;
};

export type IdentityMatchClass =
  | "same"
  | "likely_same"
  | "possible_duplicate"
  | "different"
  | "new";

export const FINGERPRINT_VERSION = 1;

function normToken(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function roundCoord(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  // ~11m precision — enough for same-property, resists GPS jitter
  return n.toFixed(4);
}

function roundLand(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return "";
  return String(Math.round(n));
}

/** Stable FNV-1a 32-bit hex hash. */
export function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Build canonical fingerprint string components (ordered, deterministic).
 * Empty components are omitted so sparse records still fingerprint stably.
 */
export function buildFingerprintComponents(input: FingerprintInput): string[] {
  const refs = (input.externalReferences ?? [])
    .map((r) => normToken(r))
    .filter(Boolean)
    .sort();

  const parts: Array<[string, string]> = [
    ["gps", [roundCoord(input.latitude), roundCoord(input.longitude)].filter(Boolean).join(",")],
    ["street", normToken(input.streetAddress)],
    ["farm", [normToken(input.farmName), normToken(input.farmNumber)].filter(Boolean).join("#")],
    ["erf", normToken(input.erfNumber)],
    ["portion", normToken(input.portionNumber)],
    ["town", normToken(input.town)],
    ["province", normToken(input.province)],
    ["land", roundLand(input.landSizeSqm) || normToken(input.combinedExtent)],
    ["img", normToken(input.primaryImageHash)],
    ["ext", refs.join(",")],
    // Title is weakest — included last and never alone sufficient for "same"
    ["title", normToken(input.title)],
  ];

  return parts.filter(([, v]) => Boolean(v)).map(([k, v]) => `${k}:${v}`);
}

export function computePropertyFingerprint(input: FingerprintInput): {
  fingerprint: string;
  components: string[];
  version: number;
  signalCount: number;
} {
  const components = buildFingerprintComponents(input);
  const payload = `v${FINGERPRINT_VERSION}|${components.join("|")}`;
  return {
    fingerprint: `pf_${fnv1aHex(payload)}_${fnv1aHex(payload.split("").reverse().join(""))}`,
    components,
    version: FINGERPRINT_VERSION,
    signalCount: components.length,
  };
}

export function classifyIdentityMatch(score: number): IdentityMatchClass {
  if (score >= 90) return "same";
  if (score >= 75) return "likely_same";
  if (score >= 55) return "possible_duplicate";
  return "different";
}
