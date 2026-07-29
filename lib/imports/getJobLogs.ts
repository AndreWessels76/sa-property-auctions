import { supabase } from "@/lib/supabase";

export async function getJobLogs(jobId:string){

    const { data } =

        await supabase

            .from("import_job_logs")

            .select("*")

            .eq("job_id",jobId)

            .order("created_at");

    return data ?? [];

}