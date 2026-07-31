import { supabase } from "@/lib/supabase";
import { calculateDistance } from "@/lib/property/comparable/radius/distanceCalculator";
import { ComparableMapProperty } from "./comparableTypes";

type PropertyRow = {
  id: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  title: string | null;
  town: string | null;
  auction_price: number | null;
  auction_date: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type: string | null;
};

function toComparable(
  item: PropertyRow,
  distanceKm: number | null,
  sameTown: boolean,
): ComparableMapProperty {
  return {
    id: item.id,
    latitude: Number(item.latitude ?? 0),
    longitude: Number(item.longitude ?? 0),
    address: item.address ?? item.title ?? "Address not recorded",
    salePrice: Number(item.auction_price ?? 0),
    saleDate: item.auction_date ?? "",
    similarityScore: 0,
    distanceKm:
      distanceKm != null ? Number(distanceKm.toFixed(2)) : Number.NaN,
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    sameTown,
  };
}

export async function getComparableSales(
  propertyId: string,
): Promise<ComparableMapProperty[]> {
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .single();

  if (propertyError || !property) {
    return [];
  }

  const subject = property as PropertyRow;
  const hasCoords =
    subject.latitude != null &&
    subject.longitude != null &&
    Number.isFinite(Number(subject.latitude)) &&
    Number.isFinite(Number(subject.longitude));

  if (hasCoords) {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .neq("id", propertyId)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(40);

    if (error) {
      console.error("Failed to fetch comparable sales:", error.message);
      return [];
    }

    return (data as PropertyRow[])
      .map((item) => {
        const distanceKm = calculateDistance(
          Number(subject.latitude),
          Number(subject.longitude),
          Number(item.latitude),
          Number(item.longitude),
        );
        return toComparable(item, distanceKm, item.town === subject.town);
      })
      .filter((item) => Number.isFinite(item.distanceKm) && item.distanceKm <= 50)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 6);
  }

  // Fallback when coordinates are missing: same town / same type.
  if (!subject.town) {
    return [];
  }

  let query = supabase
    .from("properties")
    .select("*")
    .neq("id", propertyId)
    .eq("town", subject.town)
    .limit(8);

  if (subject.property_type) {
    query = query.eq("property_type", subject.property_type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch town comparables:", error.message);
    return [];
  }

  let rows = (data as PropertyRow[]) ?? [];

  if (rows.length === 0) {
    const { data: townRows, error: townError } = await supabase
      .from("properties")
      .select("*")
      .neq("id", propertyId)
      .eq("town", subject.town)
      .limit(8);

    if (townError) {
      return [];
    }
    rows = (townRows as PropertyRow[]) ?? [];
  }

  return rows.map((item) => toComparable(item, null, true)).slice(0, 6);
}
