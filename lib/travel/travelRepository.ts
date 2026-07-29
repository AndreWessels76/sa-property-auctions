import { createClient }

from "@/lib/supabase/server";

export async function saveTravelData(

    records:any[]

){

    const supabase=

        await createClient();

    const { error }=

        await supabase

        .from("travel_times")

        .upsert(records);

    if(error)

        throw error;

}
