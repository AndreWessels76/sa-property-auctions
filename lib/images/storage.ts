import { supabase } from "@/lib/supabase";

/**
 * Browser / authenticated-session storage helpers.
 * Acquisition and other privileged server jobs must use `storage.server.ts`.
 */
export async function uploadPropertyImage(file: File, propertyId: string) {
  const extension = file.name.split(".").pop() || "jpg";
  const filename = `${propertyId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("property-images")
    .upload(filename, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from("property-images").getPublicUrl(filename);
  return data.publicUrl;
}

export async function deletePropertyImage(path: string) {
  const { error } = await supabase.storage.from("property-images").remove([path]);
  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}

export async function listImages(propertyId: string) {
  return supabase.storage.from("property-images").list(propertyId);
}
