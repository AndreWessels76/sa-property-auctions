import { supabase } from "@/lib/supabase";

export async function getDashboardStats() {
  const { count: properties } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true });

  const { count: images } = await supabase
    .from("property_images")
    .select("*", { count: "exact", head: true });

  const { count: merges } = await supabase
    .from("property_merge_history")
    .select("*", { count: "exact", head: true });

  const { data: quality } = await supabase
    .from("properties")
    .select("quality_score");

  const averageQuality = quality?.length
    ? Math.round(
        quality.reduce(
          (sum, item) => sum + (item.quality_score ?? 0),
          0,
        ) / quality.length,
      )
    : 0;

  return {
    properties: properties ?? 0,
    images: images ?? 0,
    merges: merges ?? 0,
    averageQuality,
  };
}
