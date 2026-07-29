import { supabase } from "@/lib/supabase";

export async function updateJobProgress(

    id:string,

    progress:number,

    currentStep:string,

    processed:number,

    total:number

){

    return await supabase

        .from("import_jobs")

        .update({

            progress,

            current_step:currentStep,

            processed_items:processed,

            total_items:total

        })

        .eq("id",id);

}

export async function pauseJob(id: string) {
  return await supabase
    .from("import_jobs")
    .update({
      paused: true,
      status: "Paused",
    })
    .eq("id", id);
}

export async function resumeJob(id: string) {
  return await supabase
    .from("import_jobs")
    .update({
      paused: false,
      status: "Running",
    })
    .eq("id", id);
}

export async function cancelJob(id: string) {
  return await supabase
    .from("import_jobs")
    .update({
      cancelled: true,
      status: "Cancelled",
      finished_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function retryJob(id: string) {
  return await supabase
    .from("import_jobs")
    .update({
      status: "Queued",
      cancelled: false,
      paused: false,
      progress: 0,
      processed_items: 0,
    })
    .eq("id", id);
}