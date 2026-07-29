import type { ImportConnector, RawProperty } from "../types";

export class SheriffConnector implements ImportConnector {
  source = "Sheriff";

  async fetch(): Promise<RawProperty[]> {

    // Tydelik toetsdata.
    // Later vervang ons dit met 'n wettige databron.

    return [
      {
        title: "Luxury House",
        town: "Pretoria",
        province: "Gauteng",
        property_type: "House",
        estimated_value: 2500000,
        auction_price: 1800000,
        image_urls: [
          "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=85",
          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85",
        ],
      },
    ];
  }

  map(data: RawProperty) {
    return {
      id: crypto.randomUUID(),
      title: String(data.title),
      description: null,
      province: String(data.province),
      town: String(data.town),
      suburb: null,
      address: null,
      property_type: String(data.property_type),
      bedrooms: 0,
      bathrooms: 0,
      garages: 0,
      estimated_value: Number(data.estimated_value),
      auction_price: Number(data.auction_price),
      auction_date: new Date().toISOString(),
      status: "Upcoming",
      source: "Sheriff",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}