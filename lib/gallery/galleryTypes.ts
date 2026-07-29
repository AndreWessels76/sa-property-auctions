export interface GalleryImage {
  id: string;
  imageUrl: string;
  thumbnail: string | null;
  blur: string | null;
  type?: string | null;
  width?: number;
  height?: number;
  quality?: number;
  isHero: boolean;
}

export interface GalleryResponse {
  propertyId: string;
  hero: GalleryImage | null;
  images: GalleryImage[];
}
