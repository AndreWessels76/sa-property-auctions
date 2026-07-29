import { createClient }

from "@/lib/supabase/server";

export async function getSafetyData(

    suburb:string

){

    const supabase=

        await createClient();

    const { data,error }=

        await supabase

        .from("safety_statistics")

        .select("*")

        .eq("suburb",suburb)

        .single();

    if(error)

        return null;

    return data;

}
