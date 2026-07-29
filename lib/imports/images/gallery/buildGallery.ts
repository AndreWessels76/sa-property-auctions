import { categorizeImage } from "./imageCategorizer";
import { GalleryEntry } from "./galleryTypes";
import { sortGallery } from "./gallerySorter";

type GalleryInput = {
  imageFileName: string;
  path: string;
  thumb: string;
  quality: number;
};

export function buildGallery(
  images: GalleryInput[]
): GalleryEntry[] {

  const gallery = images.map((image) => {
    const { imageFileName } = image;

    const category = categorizeImage(
      imageFileName
    );

    return {
      type: category.category,
      path: image.path,
      thumb: image.thumb,
      quality: image.quality,
    };
  });

  return sortGallery(gallery);

}
