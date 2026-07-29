import { supabase } from "@/lib/supabase";
import { calculateDistance } from "@/lib/property/comparable/radius/distanceCalculator";
import { ComparableMapProperty } from "./comparableTypes";

export async function getComparableSales(
  propertyId: string
): Promise<ComparableMapProperty[]> {

  const { data: property, error: propertyError } =
    await supabase
      .from("properties")
      .select("*")
      .eq("id", propertyId)
      .single();

  if (propertyError || !property?.latitude || !property?.longitude) {
    return [];
  }

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .neq("id", propertyId)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .limit(20);

  if (error) {
    console.error("Failed to fetch comparable sales:", error.message);
    return [];
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    latitude: Number(item.latitude),
    longitude: Number(item.longitude),
    address:
      item.address ??
      item.title ??
      "",
    salePrice: Number(item.auction_price ?? 0),
    saleDate: item.auction_date ?? "",
    similarityScore: 0,
    distanceKm: Number(
      calculateDistance(
        Number(property.latitude),
        Number(property.longitude),
        Number(item.latitude),
        Number(item.longitude)
      ).toFixed(2)
    ),
  }));

}
