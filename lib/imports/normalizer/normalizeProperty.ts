import { PropertyModel } from "./PropertyModel";
import { normalizePrice } from "./normalizePrice";
import { normalizeDate } from "./normalizeDate";
import { normalizeImages } from "./normalizeImages";
import { normalizeAddress } from "./normalizeAddress";

export function normalizeProperty(
  source: string,
  raw: Record<string, any>
): PropertyModel {

  return {

    source,

    externalId:
      raw.id ??
      raw.property_id ??
      raw.reference ??
      crypto.randomUUID(),

    title:
      raw.title ??
      raw.heading ??
      raw.description ??
      "Untitled Property",

    description:
      raw.description ?? "",

    province:
      raw.province ?? "",

    town:
      raw.town ?? raw.city ?? "",

    suburb:
      raw.suburb ?? "",

    address:
      normalizeAddress(
        raw.address
      ),

    erfNumber:
      raw.erf ??
      raw.erf_number ??
      "",

    propertyType:
      raw.property_type ??
      raw.type ??
      "Unknown",

    bedrooms:
      Number(raw.bedrooms) || null,

    bathrooms:
      Number(raw.bathrooms) || null,

    garages:
      Number(raw.garages) || null,

    floorArea:
      Number(raw.floor_area) || null,

    erfSize:
      Number(raw.erf_size) || null,

    estimatedValue:
      normalizePrice(
        raw.estimated_value
      ),

    auctionPrice:
      normalizePrice(
        raw.auction_price
      ),

    auctionDate:
      normalizeDate(
        raw.auction_date
      ),

    latitude:
      Number(raw.latitude) || null,

    longitude:
      Number(raw.longitude) || null,

    images:
      normalizeImages(
        raw.images
      ),

  };

}