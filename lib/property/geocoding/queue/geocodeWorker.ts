import { createClient } from "@/lib/supabase/server";

export async function getNextGeocodeJob() {

    const supabase = await createClient();

    const { data } = await supabase

        .from("import_queue")

        .select("*")

        .eq("queue_type", "geocode")

        .eq("status", "pending")

        .order("created_at")

        .limit(1);

    return data?.[0] ?? null;

}
