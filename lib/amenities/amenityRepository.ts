import { createClient } from "@/lib/supabase/server";

export async function getNearbyAmenities(){

    const supabase=await createClient();

    const {data,error}=await supabase

        .from("amenities")

        .select("*");

    if(error){

        throw error;

    }

    return data;

}
