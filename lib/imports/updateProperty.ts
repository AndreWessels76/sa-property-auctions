import { supabase } from "@/lib/supabase";

import type { Property } from "@/lib/types/property";

export async function updateProperty(
    property: Property
){

    return await supabase

        .from("properties")

        .update(property)

        .eq("id",property.id);

}