import { createClient } from "@/lib/supabase/server";

export async function getPublicUrl(

    bucket: string,

    path: string

) {

    const supabase = await createClient();

    const { data } = supabase.storage

        .from(bucket)

        .getPublicUrl(path);

    return data.publicUrl;

}