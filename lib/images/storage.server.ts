import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";

function contentTypeForName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "image/jpeg";
}

/**
 * Privileged storage writes for acquisition / importers (bypasses storage RLS).
 */
export async function uploadPropertyImageServer(
  file: File,
  propertyId: string,
) {
  const db = createServiceClient();
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(extension)
    ? extension === "jpeg"
      ? "jpg"
      : extension
    : "jpg";
  const filename = `${propertyId}/${crypto.randomUUID()}.${safeExt}`;
  const contentType =
    file.type && file.type !== "application/octet-stream"
      ? file.type
      : contentTypeForName(filename);

  const { error } = await db.storage
    .from("property-images")
    .upload(filename, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = db.storage.from("property-images").getPublicUrl(filename);
  return data.publicUrl;
}
