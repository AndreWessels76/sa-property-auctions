import { supabase } from "@/lib/supabase";

export async function logJob(

    jobId:string,

    level:"INFO"|"SUCCESS"|"WARNING"|"ERROR"|"DEBUG",

    message:string

){

    return await supabase

        .from("import_job_logs")

        .insert({

            job_id:jobId,

            level,

            message

        });

}