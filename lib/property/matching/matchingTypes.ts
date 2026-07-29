export interface PropertyRecord {

    id: string;

    address: string | null;

    suburb: string | null;

    town: string | null;

    province: string | null;

    erfNumber: string | null;

    titleDeed: string | null;

    latitude: number | null;

    longitude: number | null;

}

export interface MatchResult {

    matched: boolean;

    confidence: number;

    reasons: string[];

}