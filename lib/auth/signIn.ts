import { createClient } from "@/lib/supabase/client";

export async function signIn(email: string, password: string) {
  const supabase = createClient();

  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}
