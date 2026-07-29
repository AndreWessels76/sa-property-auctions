import { createClient } from "@/lib/supabase/client";

export async function updatePassword(
    password: string
) {
    const supabase = createClient();

    return await supabase.auth.updateUser({

        password

    });
}
