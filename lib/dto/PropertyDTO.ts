export interface PropertyDTO {
  id: string;
  title: string;
  description: string | null;
  province: string | null;
  town: string | null;
  suburb: string | null;
  address: string | null;
  auction_date: string | null;
  auction_price: number | null;
  estimated_value: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  property_type: string | null;
  status: string | null;
  source: string | null;
  latitude: number | null;
  longitude: number | null;
  image: string | null;
  thumbnail: string | null;
  heroImage: string | null;
  blur_placeholder: string | null;
  qualityScore: number | null;
  featured: boolean;
}
