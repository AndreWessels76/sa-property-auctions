import { createClient } from "@/lib/supabase/server";

export async function enqueueGeocodeJob(

    propertyId: string,

    address: string

) {

    const supabase = await createClient();

    const { error } = await supabase

        .from("import_queue")

        .insert({

            queue_type: "geocode",

            property_id: propertyId,

            payload: {

                address

            },

            status: "pending"

        });

    if (error) {

        throw error;

    }

}
