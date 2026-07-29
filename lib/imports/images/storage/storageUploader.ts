import { createClient } from "@/lib/supabase/server";

export async function uploadImage(

    bucket: string,

    path: string,

    buffer: Buffer,

    mimeType: string

) {

    const supabase = await createClient();

    const { data, error } = await supabase.storage

        .from(bucket)

        .upload(path, buffer, {

            contentType: mimeType,

            upsert: true

        });

    if (error) {

        throw error;

    }

    return data;

}