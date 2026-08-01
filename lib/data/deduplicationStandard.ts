import { scoreAddress } from "@/lib/imports/duplicate/scoreAddress";
import { scoreCoordinates } from "@/lib/imports/duplicate/scoreCoordinates";
import { scoreTitle } from "@/lib/imports/duplicate/scoreTitle";

/**
 * Deduplication standard — confidence from multiple signals.
 * Never create duplicate listings; merge when confidence is high.
 */

export type DedupSignals = {
  externalListingId?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  title?: string | null;
  auctionDate?: string | null;
  imageHash?: string | null;
  agency?: string | null;
};

export type DedupAssessment = {
  confidenceScore: number;
  signals: string[];
  recommendMerge: boolean;
  recommendReview: boolean;
};

function normalizeId(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function sameDay(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.slice(0, 10) === b.slice(0, 10);
}

export function assessDuplicateConfidence(
  incoming: DedupSignals,
  existing: DedupSignals,
): DedupAssessment {
  const signals: string[] = [];
  let score = 0;
  let weightUsed = 0;

  const add = (points: number, weight: number, label: string) => {
    score += points * weight;
    weightUsed += weight;
    if (points >= 80) signals.push(label);
  };

  const extIn = normalizeId(incoming.externalListingId);
  const extEx = normalizeId(existing.externalListingId);
  if (extIn && extEx) {
    add(extIn === extEx ? 100 : 0, 0.3, "external_listing_id");
  }

  if (incoming.address && existing.address) {
    add(scoreAddress(incoming.address, existing.address), 0.2, "address");
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
      0.15,
      "coordinates",
    );
  }

  if (incoming.title && existing.title) {
    add(scoreTitle(incoming.title, existing.title), 0.1, "title");
  }

  if (incoming.auctionDate && existing.auctionDate) {
    add(sameDay(incoming.auctionDate, existing.auctionDate) ? 100 : 20, 0.1, "auction_date");
  }

  const hashIn = normalizeId(incoming.imageHash);
  const hashEx = normalizeId(existing.imageHash);
  if (hashIn && hashEx) {
    add(hashIn === hashEx ? 100 : 0, 0.1, "image_hash");
  }

  const agencyIn = normalizeId(incoming.agency);
  const agencyEx = normalizeId(existing.agency);
  if (agencyIn && agencyEx) {
    add(agencyIn === agencyEx ? 100 : 40, 0.05, "agency");
  }

  const confidenceScore =
    weightUsed > 0 ? Math.round(score / weightUsed) : 0;

  return {
    confidenceScore,
    signals,
    recommendMerge: confidenceScore >= 85,
    recommendReview: confidenceScore >= 70 && confidenceScore < 85,
  };
}
