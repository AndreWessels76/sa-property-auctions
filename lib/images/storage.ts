import { supabase } from "@/lib/supabase";

export async function uploadPropertyImage(
  file: File,
  propertyId: string
) {
  const extension = file.name.split(".").pop();

  const filename =
    `${propertyId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("property-images")
    .upload(filename, file);

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from("property-images")
    .getPublicUrl(filename);

  return data.publicUrl;
}

export async function deletePropertyImage(
  path: string
) {
  return await supabase.storage
    .from("property-images")
    .remove([path]);
}

export async function listImages(
  propertyId: string
) {
  return await supabase.storage
    .from("property-images")
    .list(propertyId);
}
