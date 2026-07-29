import { createSupabaseClient } from "@/lib/supabase";
import type { Property } from "@/lib/types/property";

export async function saveProperty(
  property: Property,
): Promise<"updated" | "inserted"> {
  const supabase = createSupabaseClient();

  const { data: existing, error: lookupError } = await supabase
    .from("properties")
    .select("id")
    .eq("title", property.title)
    .eq("town", property.town)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Failed to look up property: ${lookupError.message}`);
  }

  if (existing) {
    const { id: _id, created_at: _createdAt, ...updatePayload } = property;
    const { error } = await supabase
      .from("properties")
      .update({
        ...updatePayload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      throw new Error(`Failed to update property: ${error.message}`);
    }

    return "updated";
  }

  const { error } = await supabase.from("properties").insert(property);

  if (error) {
    throw new Error(`Failed to insert property: ${error.message}`);
  }

  return "inserted";
}
