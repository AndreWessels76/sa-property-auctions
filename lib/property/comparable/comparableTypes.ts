export interface ComparableProperty {

    id: string;

    title: string;

    province: string | null;

    town: string | null;

    suburb: string | null;

    bedrooms: number;

    bathrooms: number;

    garages: number;

    estimatedValue: number | null;

    auctionPrice: number | null;

    latitude: number | null;

    longitude: number | null;

    propertyType: string | null;

    floorSize: number | null;

    erfSize: number | null;

}

export interface ComparableResult {

    property: ComparableProperty;

    score: number;

    reasons: string[];

}
