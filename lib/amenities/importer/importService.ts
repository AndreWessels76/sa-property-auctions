import { createClient }

from "@/lib/supabase/server";

export async function saveAmenities(

    amenities:any[]

){

    const supabase=

        await createClient();

    const { error }=

        await supabase

        .from("amenities")

        .upsert(

            amenities,

            {

                onConflict:"name"

            }

        );

    if(error)

        throw error;

}
