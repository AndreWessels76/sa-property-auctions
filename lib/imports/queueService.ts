import { supabase } from "@/lib/supabase";

export async function enqueueJob(
    sourceId: string,
    jobId: string,
    priority = 5
) {

    const { data, error } =
        await supabase
            .from("import_queue")
            .insert({
                source_id: sourceId,
                job_id: jobId,
                priority,
                queue_status: "Waiting",
            })
            .select()
            .single();

    if (error) throw error;

    return data;
}

export async function getNextQueuedJob() {
    const { data } =
        await supabase
            .from("import_queue")
            .select("*")
            .eq("queue_status", "Waiting")
            .order("priority", { ascending: true })
            .order("created_at", { ascending: true })
            .limit(1)
            .single();

    return data;
}

export async function startQueuedJob(id: string) {
    return await supabase
        .from("import_queue")
        .update({
            queue_status: "Running",
            started_at: new Date().toISOString(),
        })
        .eq("id", id);
}

export async function finishQueuedJob(id: string) {
    return await supabase
        .from("import_queue")
        .update({
            queue_status: "Completed",
            finished_at: new Date().toISOString(),
        })
        .eq("id", id);
}

export async function getQueue() {
  const { data, error } = await supabase
    .from("import_queue")
    .select(`
      *,
      import_sources(name),
      import_jobs(status,progress)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

export async function getQueueStats() {
  const queue = await getQueue();

  return {
    waiting: queue.filter(
      q => q.queue_status === "Waiting"
    ).length,

    running: queue.filter(
      q => q.queue_status === "Running"
    ).length,

    completed: queue.filter(
      q => q.queue_status === "Completed"
    ).length,

    failed: queue.filter(
      q => q.queue_status === "Failed"
    ).length,
  };
}