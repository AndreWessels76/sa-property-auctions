export interface PropertySearchDTO {
  search?: string;

  province?: string;
  town?: string;
  suburb?: string;

  propertyType?: string;

  source?: string;

  status?: string;

  minPrice?: number;
  maxPrice?: number;

  minEstimatedValue?: number;
  maxEstimatedValue?: number;

  minBedrooms?: number;
  maxBedrooms?: number;

  minBathrooms?: number;
  maxBathrooms?: number;

  minGarages?: number;

  auctionFrom?: string;
  auctionTo?: string;

  minErfSize?: number;
  maxErfSize?: number;
  minFloorSize?: number;
  maxFloorSize?: number;
  minHectares?: number;
  maxHectares?: number;

  agriculturalType?: string;
  agency?: string;

  sort?:
    | "auction"
    | "price-low"
    | "price-high"
    | "value-high";

  page?: number;

  pageSize?: number;
}
