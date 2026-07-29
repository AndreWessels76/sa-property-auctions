import { createClient }

from "@/lib/supabase/server";

export async function getNearbySchools(){

    const supabase=

        await createClient();

    const { data,error }=

        await supabase

        .from("schools")

        .select("*");

    if(error)

        throw error;

    return data;

}
