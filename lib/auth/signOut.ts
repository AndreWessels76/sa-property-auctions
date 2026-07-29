import { createClient } from "@/lib/supabase/client";

export async function signOut() {
  const supabase = createClient();

  await supabase.auth.signOut();
}
