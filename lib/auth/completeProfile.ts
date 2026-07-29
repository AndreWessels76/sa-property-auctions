import { createClient } from "@/lib/supabase/client";
import { clearCachedProfile } from "./profileCache";
import { toError } from "@/lib/errors/formatError";
import { SUBSCRIPTIONS } from "@/lib/subscription";

export async function completeProfile(
  firstName: string,
  lastName: string,
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not found");
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    first_name: firstName,
    last_name: lastName,
    role: "free",
    subscription_status: SUBSCRIPTIONS.INACTIVE,
  });

  if (error) {
    throw toError(error, "Failed to complete profile");
  }

  clearCachedProfile(user.id);

  return true;
}
