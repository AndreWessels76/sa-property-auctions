import { calculateImageQuality } from "@/lib/images/imageQuality";

/**
 * Image pipeline metadata — every image must support these fields.
 */

export type ImagePipelineRecord = {
  url: string;
  primary: boolean;
  gallery: boolean;
  source: string | null;
  copyright: string | null;
  verified: boolean;
  hash: string | null;
  duplicateOf: string | null;
  brokenUrl: boolean;
  placeholderQuality: "none" | "blur" | "low" | "good";
  qualityScore: number;
  qualityRating: string;
};

export function scoreImagePipelineAsset(input: {
  url?: string | null;
  width?: number | null;
  height?: number | null;
  bytes?: number | null;
  hash?: string | null;
  source?: string | null;
  copyright?: string | null;
  verified?: boolean;
  primary?: boolean;
  isDuplicate?: boolean;
  brokenUrl?: boolean;
  hasBlurPlaceholder?: boolean;
}): ImagePipelineRecord {
  const broken = Boolean(input.brokenUrl || !input.url?.trim());
  const quality =
    !broken &&
    input.width != null &&
    input.height != null &&
    input.bytes != null
      ? calculateImageQuality(input.width, input.height, input.bytes)
      : { score: broken ? 0 : 25, rating: broken ? "Broken" : "Unknown" };

  let placeholderQuality: ImagePipelineRecord["placeholderQuality"] = "none";
  if (input.hasBlurPlaceholder) placeholderQuality = "good";
  else if (broken) placeholderQuality = "low";

  return {
    url: input.url?.trim() || "",
    primary: Boolean(input.primary),
    gallery: !input.primary,
    source: input.source?.trim() || null,
    copyright: input.copyright?.trim() || null,
    verified: Boolean(input.verified),
    hash: input.hash?.trim() || null,
    duplicateOf: input.isDuplicate ? "duplicate_candidate" : null,
    brokenUrl: broken,
    placeholderQuality,
    qualityScore: quality.score,
    qualityRating: quality.rating,
  };
}
