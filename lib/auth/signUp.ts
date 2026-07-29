import { createClient } from "@/lib/supabase/client";

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "")
  );
}

export async function signUp(
  email: string,
  password: string,
  metadata?: { firstName?: string; lastName?: string },
) {
  const supabase = createClient();
  const base = siteUrl();

  return await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: base ? `${base}/login` : undefined,
      data: {
        first_name: metadata?.firstName ?? "",
        last_name: metadata?.lastName ?? "",
      },
    },
  });
}
