import { createClient } from "@/lib/supabase/client";

/**
 * Resend Supabase signup confirmation email.
 * Requires Auth → confirm email enabled.
 */
export async function resendVerification(email: string) {
  const supabase = createClient();
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");

  return await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: base ? `${base}/login` : undefined,
    },
  });
}
