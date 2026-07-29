import { createClient } from "@/lib/supabase/server";

export async function reserveJob(

    id: string,

    worker: string

) {

    const supabase = await createClient();

    const { error } = await supabase

        .from("import_queue")

        .update({

            status: "reserved",

            worker_name: worker,

            started_at: new Date().toISOString()

        })

        .eq("id", id)

        .eq("status", "pending");

    if (error) {

        throw error;

    }

}
