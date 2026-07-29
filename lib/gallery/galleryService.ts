import { supabase } from "@/lib/supabase";
import { mapGalleryImage } from "./galleryMapper";

export async function getGallery(
  propertyId: string
) {

  const { data, error } = await supabase
    .from("property_images")
    .select("*")
    .eq("property_id", propertyId)
    .order("display_order")
    .limit(30);

  if (error) throw error;

  const images = (data ?? []).map(mapGalleryImage);

  const hero =
    images.find((i) => i.isHero) ?? images[0] ?? null;

  return {
    propertyId,
    hero,
    images,
  };

}
