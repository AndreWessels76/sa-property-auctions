import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./supabase/env";

/**
 * Shared anon client for public/server data reads (no cookie session).
 * Auth UI and protected routes should use `@/lib/supabase/client` or `server`.
 */
export function createSupabaseClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();
  return createClient(url, anonKey);
}

export const supabase = createSupabaseClient();
