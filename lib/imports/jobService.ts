import { supabase } from "@/lib/supabase";

export async function createImportJob(sourceId: string) {
  const { data, error } = await supabase
    .from("import_jobs")
    .insert({
      source_id: sourceId,
      status: "Running",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function finishImportJob(
  id: string,
  stats: {
    properties: number;
    images: number;
    duplicates: number;
    merges: number;
    errors: number;
  },
) {
  const started = new Date();
  const finished = new Date();

  const duration = Math.floor(
    (finished.getTime() - started.getTime()) / 1000,
  );

  await supabase
    .from("import_jobs")
    .update({
      status: "Completed",
      finished_at: finished,
      duration_seconds: duration,
      properties_imported: stats.properties,
      images_imported: stats.images,
      duplicates: stats.duplicates,
      merges: stats.merges,
      errors: stats.errors,
    })
    .eq("id", id);
}

export async function getRecentJobs() {
  const { data } = await supabase
    .from("import_jobs")
    .select("*, import_sources(name)")
    .order("created_at", {
      ascending: false,
    })
    .limit(20);

  return data ?? [];
}
