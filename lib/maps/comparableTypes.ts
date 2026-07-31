export interface ComparableMapProperty {
  id: string;
  latitude: number;
  longitude: number;
  address: string;
  salePrice: number;
  saleDate: string;
  similarityScore: number;
  distanceKm: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sameTown?: boolean;
}
