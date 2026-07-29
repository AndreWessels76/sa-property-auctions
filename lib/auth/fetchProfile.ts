import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import type { CurrentProfile } from "./profileTypes";
import { profileCache } from "./profileCache";

export async function fetchProfile(
  id: string,
): Promise<CurrentProfile | null> {
  if (profileCache.has(id)) {
    return profileCache.get(id)!;
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, avatar_url, role, subscription_status",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logger.error("Failed to load profile", error);
    return null;
  }

  if (data) {
    profileCache.set(id, data);
  }

  return data;
}
