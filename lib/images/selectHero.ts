import { calculateImageQuality } from "./imageQuality";

type RankableImage = {
  id?: string;
  image_url?: string;
  storage_path?: string | null;
  width?: number | null;
  height?: number | null;
  bytes?: number | null;
  is_primary?: boolean | null;
};

function scoreImage(image: RankableImage) {
  const width = image.width ?? 0;
  const height = image.height ?? 0;
  const bytes = image.bytes ?? 0;

  const quality = calculateImageQuality(width, height, bytes);

  return quality.score;
}

export function selectHeroImage(images: RankableImage[]) {
  if (images.length === 0) return null;

  const ranked = [...images].sort(
    (a, b) => scoreImage(b) - scoreImage(a),
  );

  return ranked[0];
}
