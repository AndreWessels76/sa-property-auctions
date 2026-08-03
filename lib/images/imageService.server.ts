import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";
import { uploadPropertyImageServer } from "./storage.server";

/**
 * Persist a property image row using only columns known to exist
 * on production `property_images`.
 */
export async function saveImageServer(
  propertyId: string,
  imageUrl: string,
  primary = false,
  _source = "Unknown",
  _width = 0,
  _height = 0,
  _bytes = 0,
) {
  const db = createServiceClient();

  const attempts: Array<Record<string, unknown>> = [
    {
      property_id: propertyId,
      image_url: imageUrl,
      is_primary: primary,
      is_hero: primary,
    },
    {
      property_id: propertyId,
      image_url: imageUrl,
      is_hero: primary,
    },
    {
      property_id: propertyId,
      image_url: imageUrl,
      is_primary: primary,
    },
    {
      property_id: propertyId,
      image_url: imageUrl,
    },
  ];

  let lastError: string | null = null;
  for (const row of attempts) {
    const { data, error } = await db
      .from("property_images")
      .insert(row)
      .select("id")
      .maybeSingle();
    if (!error) return data;
    lastError = error.message;
    if (!/column|schema cache/i.test(error.message)) {
      throw new Error(`property_images insert failed: ${error.message}`);
    }
  }

  throw new Error(`property_images insert failed: ${lastError}`);
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
