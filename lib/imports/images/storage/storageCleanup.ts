import { createClient } from "@/lib/supabase/server";

export async function deleteImage(

    bucket: string,

    path: string

) {

    const supabase = await createClient();

    const { error } = await supabase.storage

        .from(bucket)

        .remove([path]);

    if (error) {

        throw error;

    }

}