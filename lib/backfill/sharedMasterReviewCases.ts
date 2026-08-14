/**
 * Post-execution shared Property Master cases requiring admin identity review.
 * Seeded into property_history_backfill_reviews — no automatic split.
 */

export type SharedMasterReviewCase = {
  caseId: string;
  masterId: string;
  /** Listing whose fingerprint differs from the master row — candidate for split. */
  reviewListingId: string;
  /** Primary listing on the master (fingerprint matches master row). */
  anchorListingId: string;
  summary: string;
};

export const POST_EXECUTION_SHARED_MASTER_CASES: SharedMasterReviewCase[] = [
  {
    caseId: "CASE_1",
    masterId: "852a132f-ff3c-4ca0-a324-a5dfd4d54ee4",
    anchorListingId: "f3f47cca-73c8-420c-9144-146b0f4c9aba",
    reviewListingId: "b8eb4cb5-d9c1-46de-a338-266357d3d8f9",
    summary:
      "Louis Trichardt 8.5HA vacant land vs vacant stand at 41 Flamboyant Street — different fingerprints",
  },
  {
    caseId: "CASE_2",
    masterId: "7eaf47fc-4468-4902-96f5-1ddcf6435f51",
    anchorListingId: "78e0ab0e-0b33-4a2a-a9e3-eda3677c6209",
    reviewListingId: "ec3e90f0-5d86-4b32-9b20-4dee592654c3",
    summary:
      "Pretoria sectional units vs Pretoria North agricultural holding — incompatible property types",
  },
];
