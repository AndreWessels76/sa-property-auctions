import { createClient } from "@/lib/supabase/client";

export type ProfileUpdates = {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
};

export async function updateProfile(updates: ProfileUpdates) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not found");
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    throw error;
  }

  return true;
}
