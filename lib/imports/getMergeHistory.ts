import { supabase } from "@/lib/supabase";

export async function getMergeHistory(
    propertyId: string
){

    const { data } =
        await supabase

            .from("property_merge_history")

            .select("*")

            .eq("property_id",propertyId)

            .order("created_at",{
                ascending:false
            });

    return data ?? [];

}