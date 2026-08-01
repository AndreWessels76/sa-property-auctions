/**
 * Auction metadata verification — never leave agency unknown when source provides it.
 */

export type AuctionVerificationResult = {
  auctionAgency: string | null;
  auctioneer: string | null;
  contactNumber: string | null;
  website: string | null;
  auctionDate: string | null;
  auctionTime: string | null;
  venue: string | null;
  registrationLink: string | null;
  terms: string | null;
  catalogue: string | null;
  brochure: string | null;
  depositRequirements: string | null;
  viewingInformation: string | null;
  score: number;
  missing: string[];
  agencyUnknownDespiteSource: boolean;
};

export function verifyAuctionFields(input: {
  auctionAgency?: string | null;
  auctioneer?: string | null;
  contactNumber?: string | null;
  website?: string | null;
  auctionDate?: string | null;
  auctionTime?: string | null;
  venue?: string | null;
  registrationLink?: string | null;
  terms?: string | null;
  catalogue?: string | null;
  brochure?: string | null;
  depositRequirements?: string | null;
  viewingInformation?: string | null;
  /** Agency inferred from source string when explicit agency missing */
  sourceDerivedAgency?: string | null;
}): AuctionVerificationResult {
  const auctionAgency =
    input.auctionAgency?.trim() ||
    input.sourceDerivedAgency?.trim() ||
    null;
  const agencyUnknownDespiteSource = Boolean(
    !input.auctionAgency?.trim() && input.sourceDerivedAgency?.trim(),
  );

  const missing: string[] = [];
  if (!auctionAgency) missing.push("auction_agency");
  if (!input.auctionDate) missing.push("auction_date");
  if (!input.auctionTime?.trim()) missing.push("auction_time");
  if (!input.venue?.trim()) missing.push("venue");
  if (!input.contactNumber?.trim() && !input.website?.trim()) {
    missing.push("contact_or_website");
  }

  let score = 0;
  if (auctionAgency) score += 30;
  if (input.auctionDate) score += 25;
  if (input.auctionTime?.trim()) score += 10;
  if (input.venue?.trim()) score += 10;
  if (input.contactNumber?.trim() || input.website?.trim()) score += 10;
  if (input.catalogue?.trim() || input.brochure?.trim()) score += 10;
  if (input.terms?.trim()) score += 5;

  return {
    auctionAgency,
    auctioneer: input.auctioneer?.trim() || null,
    contactNumber: input.contactNumber?.trim() || null,
    website: input.website?.trim() || null,
    auctionDate: input.auctionDate ?? null,
    auctionTime: input.auctionTime?.trim() || null,
    venue: input.venue?.trim() || null,
    registrationLink: input.registrationLink?.trim() || null,
    terms: input.terms?.trim() || null,
    catalogue: input.catalogue?.trim() || null,
    brochure: input.brochure?.trim() || null,
    depositRequirements: input.depositRequirements?.trim() || null,
    viewingInformation: input.viewingInformation?.trim() || null,
    score: Math.min(100, score),
    missing,
    agencyUnknownDespiteSource,
  };
}
