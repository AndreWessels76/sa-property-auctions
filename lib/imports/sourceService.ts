import { supabase } from "@/lib/supabase";

export async function getImportSources() {
  const { data, error } = await supabase
    .from("import_sources")
    .select("*")
    .order("name");

  if (error) throw error;

  return data ?? [];
}

export async function updateImportSource(
  id: string,
  updates: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("import_sources")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}
