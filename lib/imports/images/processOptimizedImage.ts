import { optimizeImage } from "./optimizeImage";
import { generateBlurPlaceholder } from "./placeholders/blurPlaceholder";
import { saveBlurPlaceholder } from "./placeholders/saveBlurPlaceholder";

export async function processOptimizedImage(
  buffer: Buffer,
  imageId?: string
) {

  const optimized =
    await optimizeImage(buffer);

  const blur =
    await generateBlurPlaceholder(
      optimized.medium
    );

  if (imageId) {
    await saveBlurPlaceholder(imageId, blur);
  }

  return {
    ...optimized,
    blur,
  };

}
