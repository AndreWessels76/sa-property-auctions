import { createClient } from "@/lib/supabase/server";

export async function recoverExpiredJobs() {

    const supabase = await createClient();

    await supabase

        .from("import_queue")

        .update({

            status: "pending",

            worker_name: null

        })

        .eq("status", "reserved");

}
