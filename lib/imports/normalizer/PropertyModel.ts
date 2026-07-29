export interface PropertyModel {

    source: string;
  
    externalId: string;
  
    title: string;
  
    description: string;
  
    province: string;
  
    town: string;
  
    suburb: string;
  
    address: string;
  
    erfNumber: string;
  
    propertyType: string;
  
    bedrooms: number | null;
  
    bathrooms: number | null;
  
    garages: number | null;
  
    floorArea: number | null;
  
    erfSize: number | null;
  
    estimatedValue: number | null;
  
    auctionPrice: number | null;
  
    auctionDate: string | null;
  
    latitude: number | null;
  
    longitude: number | null;
  
    images: string[];
  
  }