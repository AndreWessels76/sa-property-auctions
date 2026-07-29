import { GalleryResponse } from "./galleryTypes";

export async function fetchGallery(
  propertyId: string
): Promise<GalleryResponse> {

  const response =
    await fetch(
      `/api/gallery/${propertyId}`
    );

  const gallery =
    await response.json();

  return gallery;

}
