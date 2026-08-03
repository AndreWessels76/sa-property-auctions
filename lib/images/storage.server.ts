import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Privileged storage writes for acquisition / importers (bypasses storage RLS).
 */
export async function uploadPropertyImageServer(
  file: File,
  propertyId: string,
) {
  const db = createServiceClient();
  const extension = file.name.split(".").pop() || "jpg";
  const filename = `${propertyId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await db.storage
    .from("property-images")
    .upload(filename, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = db.storage.from("property-images").getPublicUrl(filename);
  return data.publicUrl;
}
