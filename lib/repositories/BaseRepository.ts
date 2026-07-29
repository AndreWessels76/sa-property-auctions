import { createClient } from "@/lib/supabase/server";
import { createSupabaseClient } from "@/lib/supabase";
import { createServiceClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { toError } from "@/lib/errors/formatError";

export abstract class BaseRepository {
  /** Cookie-aware client for user-scoped RLS (profiles, alerts, watchlist). */
  protected static async db() {
    return createClient();
  }

  /**
   * Cookie-free anon client for public reads.
   * Safe to use inside `unstable_cache` (no cookies()/headers()).
   */
  protected static publicDb() {
    return createSupabaseClient();
  }

  /** Service-role client for webhooks and privileged server writes. */
  protected static adminDb() {
    return createServiceClient();
  }

  protected static handleError(operation: string, error: unknown): never {
    const details = toError(error, "Database operation failed.");

    logger.error(`[Repository] ${operation}`, details.message);

    throw details;
  }
}
