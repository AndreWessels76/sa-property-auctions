import { supabase } from "@/lib/supabase";
import { calculateImageQuality } from "./imageQuality";
import { uploadPropertyImage } from "./storage";

export async function saveImage(
  propertyId: string,
  imageUrl: string,
  primary = false,
  source = "Unknown",
  width = 0,
  height = 0,
  bytes = 0,
) {
  const quality = calculateImageQuality(width, height, bytes);

  return await supabase.from("property_images").insert({
    property_id: propertyId,
    image_url: imageUrl,
    is_primary: primary,
    source,
    width,
    height,
    bytes,
    quality_score: quality.score,
    quality_rating: quality.rating,
  });
}

export async function uploadAndSaveImage(
  file: File,
  property: { id: string },
  primary = true,
  source = "Sheriff",
  width = 0,
  height = 0,
) {
  const publicUrl = await uploadPropertyImage(file, property.id);

  await saveImage(
    property.id,
    publicUrl,
    primary,
    source,
    width,
    height,
    file.size,
  );

  return publicUrl;
}
