import { createClient } from "@/lib/supabase/server";

export async function loadWeights() {

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("comparable_weights")
        .select("*");

    if (error) {
        throw error;
    }

    return data;
}
