import { supabase } from "@/lib/supabase";

import { compareProperties } from "@/lib/ai/duplicate";

import type { Property } from "@/lib/types/property";

export async function findDuplicate(

    property: Property

) {

    const { data } =
        await supabase

            .from("properties")

            .select("*");

    if (!data)
        return null;

    for (const existing of data) {

        const result =
            compareProperties(
                property,
                existing as Property
            );

        if (result.duplicate) {

            return existing;

        }

    }

    return null;

}