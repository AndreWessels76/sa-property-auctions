import { supabase } from "@/lib/supabase";

export async function logMergeHistory(
  propertyId: string,
  source: string,
  action: string,
  details?: string
) {
  return await supabase
    .from("property_merge_history")
    .insert({
      property_id: propertyId,
      source,
      action,
      details,
    });
}