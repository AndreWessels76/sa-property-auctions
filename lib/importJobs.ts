import { createSupabaseClient } from "@/lib/supabase";

export async function saveImportJob(job: {
  source: string;
  status: string;
  imported: number;
  updated: number;
  properties: number;
}) {
  const supabase = createSupabaseClient();

  const { error } = await supabase.from("import_jobs").insert({
    ...job,
    last_run: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to save import job: ${error.message}`);
  }
}

export async function getLatestImportJobs() {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("import_jobs")
    .select("*")
    .order("last_run", { ascending: false });

  if (error) {
    throw new Error(`Failed to load import jobs: ${error.message}`);
  }

  return data ?? [];
}
