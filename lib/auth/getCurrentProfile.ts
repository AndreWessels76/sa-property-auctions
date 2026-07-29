import { createClient } from "@/lib/supabase/server";
import { toError } from "@/lib/errors/formatError";
import type { CurrentProfile } from "./profileTypes";

export type { CurrentProfile } from "./profileTypes";

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, avatar_url, role, subscription_status",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw toError(error, "Failed to load profile");
  }

  return profile;
}
