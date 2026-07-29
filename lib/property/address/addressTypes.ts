export interface ParsedAddress {

    unit: string | null;

    streetNumber: string | null;

    streetName: string | null;

    suburb: string | null;

    town: string | null;

    province: string | null;

    postalCode: string | null;

    original: string;

    normalized: string;

}