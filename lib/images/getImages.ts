import { ImageRepository } from "@/lib/repositories";

export async function getImages(propertyId: string) {
  return ImageRepository.byProperty(propertyId);
}
