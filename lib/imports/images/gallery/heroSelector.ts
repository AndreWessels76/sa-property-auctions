import { GalleryEntry } from "./galleryTypes";

export function selectHeroImage(
  images: GalleryEntry[]
): GalleryEntry | null {

  if (!images.length) return null;

  const priority = [
    "front",
    "street",
    "garden",
    "lounge",
    "kitchen",
  ];

  for (const type of priority) {
    const image = images
      .filter((img) => img.type === type)
      .sort((a, b) => b.quality - a.quality)[0];

    if (image) return image;
  }

  return [...images].sort(
    (a, b) => b.quality - a.quality
  )[0];

}
