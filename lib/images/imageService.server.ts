import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";
import { calculateImageQuality } from "./imageQuality";
import { uploadPropertyImageServer } from "./storage.server";

export async function saveImageServer(
  propertyId: string,
  imageUrl: string,
  primary = false,
  source = "Unknown",
  width = 0,
  height = 0,
  bytes = 0,
) {
  const db = createServiceClient();
  const quality = calculateImageQuality(width, height, bytes);

  const { data, error } = await db
    .from("property_images")
    .insert({
      property_id: propertyId,
      image_url: imageUrl,
      is_primary: primary,
      is_hero: primary,
      source,
      width,
      height,
      bytes,
      quality_score: quality.score,
      quality_rating: quality.rating,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`property_images insert failed: ${error.message}`);
  }

  return data;
}

export async function uploadAndSaveImageServer(
  file: File,
  propertyId: string,
  primary = false,
  source = "Unknown",
  width = 0,
  height = 0,
) {
  const publicUrl = await uploadPropertyImageServer(file, propertyId);
  await saveImageServer(
    propertyId,
    publicUrl,
    primary,
    source,
    width,
    height,
    file.size,
  );
  return publicUrl;
}
