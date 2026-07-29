import { GalleryEntry } from "./galleryTypes";

export function sortGallery(
  images: GalleryEntry[]
) {

  const order = [
    "front",
    "street",
    "garden",
    "lounge",
    "kitchen",
    "bedroom",
    "bathroom",
    "garage",
    "rear",
    "floorplan",
  ];

  return [...images].sort((a, b) => {
    const aIndex = order.indexOf(a.type ?? "");
    const bIndex = order.indexOf(b.type ?? "");

    return aIndex - bIndex;
  });

}
