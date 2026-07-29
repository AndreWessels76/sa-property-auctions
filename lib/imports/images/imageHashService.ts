import { supabase } from "@/lib/supabase";

export async function getImageHash(hash: string) {

    const { data } =
        await supabase

            .from("image_hashes")

            .select("*")

            .eq("sha256", hash)

            .maybeSingle();

    return data;

}

export async function saveImageHash(

    hash: string,

    storagePath: string,

    width: number,

    height: number,

    fileSize: number,

    mime: string

) {

    await supabase

        .from("image_hashes")

        .insert({

            sha256: hash,

            storage_path: storagePath,

            width,

            height,

            file_size: fileSize,

            mime_type: mime

        });

}