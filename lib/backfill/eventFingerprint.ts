/**
 * Deterministic auction event fingerprint for duplicate detection.
 */

import { fnv1aHex } from "@/lib/identity/fingerprint";

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function computeEventFingerprint(input: {
  propertyMasterId: string;
  auctionDate?: string | null;
  auctionOpenDate?: string | null;
  auctionCloseDate?: string | null;
  sourceId?: string | null;
  agency?: string | null;
  externalEventId?: string | null;
  connectorId?: string | null;
  sourceUrl?: string | null;
}): string {
  const parts = [
    norm(input.propertyMasterId),
    norm(input.auctionDate),
    norm(input.auctionOpenDate),
    norm(input.auctionCloseDate),
    norm(input.connectorId),
    norm(input.externalEventId ?? input.sourceId),
    norm(input.agency),
    norm(input.sourceUrl),
  ].filter(Boolean);

  const payload = parts.join("|");
  return `ev_${fnv1aHex(payload)}_${fnv1aHex(payload.split("").reverse().join(""))}`;
}
