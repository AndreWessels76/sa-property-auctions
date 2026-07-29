import { createClient } from "@/lib/supabase/client";

export async function resetPassword(
    email: string
) {
    const supabase = createClient();

    return await supabase.auth.resetPasswordForEmail(
        email,
        {
            redirectTo:
                `${window.location.origin}/reset-password`
        }
    );
}
