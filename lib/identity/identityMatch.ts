import {
  classifyIdentityMatch,
  computePropertyFingerprint,
  type FingerprintInput,
  type IdentityMatchClass,
} from "@/lib/identity/fingerprint";
import { scoreAddress } from "@/lib/imports/duplicate/scoreAddress";
import { scoreCoordinates } from "@/lib/imports/duplicate/scoreCoordinates";
import { scoreTitle } from "@/lib/imports/duplicate/scoreTitle";

/**
 * Identity matching — deterministic, multi-signal.
 * Never relies on title alone for "same".
 */

export type IdentityCandidate = FingerprintInput & {
  id: string;
  fingerprint?: string | null;
};

export type IdentityMatchResult = {
  matchClass: IdentityMatchClass;
  confidence: number;
  signals: string[];
  fingerprint: string;
  fingerprintComponents: string[];
  matchedMasterId: string | null;
  recommendLink: boolean;
  recommendReview: boolean;
  notes: string[];
};

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function sameToken(a?: string | null, b?: string | null): boolean {
  const x = norm(a);
  const y = norm(b);
  return Boolean(x && y && x === y);
}

/**
 * Score identity similarity 0–100 from available verified signals only.
 */
export function scoreIdentityMatch(
  incoming: FingerprintInput,
  existing: FingerprintInput,
): { confidence: number; signals: string[]; notes: string[] } {
  const signals: string[] = [];
  const notes: string[] = [];
  let weighted = 0;
  let weight = 0;

  const add = (points: number, w: number, label: string, minForSignal = 80) => {
    if (w <= 0) return;
    weighted += points * w;
    weight += w;
    if (points >= minForSignal) signals.push(label);
  };

  // Strong cadastral signals
  if (incoming.erfNumber && existing.erfNumber) {
    add(sameToken(incoming.erfNumber, existing.erfNumber) ? 100 : 0, 0.25, "erf_number");
  }
  if (incoming.farmNumber && existing.farmNumber) {
    const farmSame =
      sameToken(incoming.farmNumber, existing.farmNumber) &&
      (!incoming.farmName ||
        !existing.farmName ||
        sameToken(incoming.farmName, existing.farmName));
    add(farmSame ? 100 : 0, 0.2, "farm_number");
  }
  if (incoming.portionNumber && existing.portionNumber) {
    add(
      sameToken(incoming.portionNumber, existing.portionNumber) ? 100 : 40,
      0.08,
      "portion",
    );
  }

  if (
    incoming.latitude != null &&
    incoming.longitude != null &&
    existing.latitude != null &&
    existing.longitude != null
  ) {
    add(
      scoreCoordinates(
        incoming.latitude,
        incoming.longitude,
        existing.latitude,
        existing.longitude,
      ),
      0.2,
      "gps",
    );
  }

  if (incoming.streetAddress && existing.streetAddress) {
    add(scoreAddress(incoming.streetAddress, existing.streetAddress), 0.15, "street");
  }

  if (incoming.town && existing.town) {
    add(sameToken(incoming.town, existing.town) ? 100 : 0, 0.08, "town", 100);
  }
  if (incoming.province && existing.province) {
    add(sameToken(incoming.province, existing.province) ? 100 : 0, 0.05, "province", 100);
  }

  if (
    typeof incoming.landSizeSqm === "number" &&
    typeof existing.landSizeSqm === "number" &&
    incoming.landSizeSqm > 0 &&
    existing.landSizeSqm > 0
  ) {
    const ratio =
      Math.min(incoming.landSizeSqm, existing.landSizeSqm) /
      Math.max(incoming.landSizeSqm, existing.landSizeSqm);
    add(Math.round(ratio * 100), 0.05, "land_size", 90);
  }

  const refsIn = new Set(
    (incoming.externalReferences ?? []).map(norm).filter(Boolean),
  );
  const refsEx = new Set(
    (existing.externalReferences ?? []).map(norm).filter(Boolean),
  );
  if (refsIn.size && refsEx.size) {
    let overlap = 0;
    for (const r of refsIn) if (refsEx.has(r)) overlap += 1;
    add(overlap > 0 ? 100 : 0, 0.12, "external_ref");
  }

  if (incoming.primaryImageHash && existing.primaryImageHash) {
    add(
      sameToken(incoming.primaryImageHash, existing.primaryImageHash) ? 100 : 0,
      0.08,
      "primary_image",
    );
  }

  // Title is weakest — capped contribution; never alone for "same"
  if (incoming.title && existing.title) {
    add(scoreTitle(incoming.title, existing.title), 0.04, "title", 95);
  }

  if (weight === 0) {
    notes.push("Insufficient identity signals — cannot claim a match.");
    return { confidence: 0, signals, notes };
  }

  const confidence = Math.round(weighted / weight);

  const strongNonTitle = signals.filter((s) => s !== "title");
  if (confidence >= 90 && strongNonTitle.length === 0) {
    notes.push("Title-only high score suppressed — need cadastral/GPS/address.");
    return {
      confidence: Math.min(confidence, 54),
      signals,
      notes,
    };
  }

  return { confidence, signals, notes };
}

export function assessIdentityMatch(
  incoming: FingerprintInput,
  candidates: IdentityCandidate[],
): IdentityMatchResult {
  const fp = computePropertyFingerprint(incoming);

  // Exact fingerprint hit
  const exact = candidates.find(
    (c) => c.fingerprint && c.fingerprint === fp.fingerprint,
  );
  if (exact) {
    return {
      matchClass: "same",
      confidence: 100,
      signals: ["fingerprint_exact", ...fp.components.map((c) => c.split(":")[0]!)],
      fingerprint: fp.fingerprint,
      fingerprintComponents: fp.components,
      matchedMasterId: exact.id,
      recommendLink: true,
      recommendReview: false,
      notes: [],
    };
  }

  let best: {
    id: string;
    confidence: number;
    signals: string[];
    notes: string[];
  } | null = null;

  for (const candidate of candidates) {
    const scored = scoreIdentityMatch(incoming, candidate);
    if (!best || scored.confidence > best.confidence) {
      best = {
        id: candidate.id,
        confidence: scored.confidence,
        signals: scored.signals,
        notes: scored.notes,
      };
    }
  }

  if (!best || best.confidence < 55) {
    return {
      matchClass: fp.signalCount >= 2 ? "new" : "different",
      confidence: best?.confidence ?? 0,
      signals: best?.signals ?? [],
      fingerprint: fp.fingerprint,
      fingerprintComponents: fp.components,
      matchedMasterId: null,
      recommendLink: false,
      recommendReview: false,
      notes: best?.notes ?? ["No sufficiently similar master found."],
    };
  }

  const matchClass = classifyIdentityMatch(best.confidence);
  return {
    matchClass,
    confidence: best.confidence,
    signals: best.signals,
    fingerprint: fp.fingerprint,
    fingerprintComponents: fp.components,
    matchedMasterId: matchClass === "different" ? null : best.id,
    recommendLink: matchClass === "same" || matchClass === "likely_same",
    recommendReview: matchClass === "possible_duplicate" || matchClass === "likely_same",
    notes: best.notes,
  };
}
