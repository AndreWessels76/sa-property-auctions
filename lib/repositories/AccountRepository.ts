import { BaseRepository } from "./BaseRepository";
import type { CurrentProfile } from "@/lib/auth/profileTypes";

export type AccountExportPayload = {
  exportedAt: string;
  user: {
    id: string;
    email: string | null;
  };
  profile: CurrentProfile | null;
  subscription: Record<string, unknown> | null;
  alerts: unknown[];
  savedSearches: unknown[];
  watchlist: unknown[];
};

/**
 * Privileged / user-scoped account operations for POPIA export and deletion.
 */
export class AccountRepository extends BaseRepository {
  static async exportForUser(
    userId: string,
    email: string | null,
  ): Promise<AccountExportPayload> {
    const db = await this.db();

    const [profileRes, alertsRes, searchesRes, watchRes] = await Promise.all([
      db
        .from("profiles")
        .select(
          "id, first_name, last_name, avatar_url, role, subscription_status, subscription_plan, subscription_expires_at, created_at, updated_at",
        )
        .eq("id", userId)
        .maybeSingle(),
      db.from("alerts").select("*").eq("user_id", userId).order("created_at", {
        ascending: false,
      }),
      db
        .from("saved_searches")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      db.from("watchlist").select("*").eq("user_id", userId).order("created_at", {
        ascending: false,
      }),
    ]);

    if (profileRes.error) {
      this.handleError("AccountRepository.export.profile", profileRes.error);
    }
    if (alertsRes.error) {
      this.handleError("AccountRepository.export.alerts", alertsRes.error);
    }
    if (searchesRes.error) {
      this.handleError("AccountRepository.export.saved_searches", searchesRes.error);
    }
    if (watchRes.error) {
      this.handleError("AccountRepository.export.watchlist", watchRes.error);
    }

    const profile = profileRes.data as {
      id: string;
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
      role: string | null;
      subscription_status: string | null;
      subscription_plan?: string | null;
      subscription_expires_at?: string | null;
    } | null;
    const subscription = profile
      ? {
          role: profile.role,
          subscription_status: profile.subscription_status,
          subscription_plan: profile.subscription_plan ?? null,
          subscription_expires_at: profile.subscription_expires_at ?? null,
        }
      : null;

    return {
      exportedAt: new Date().toISOString(),
      user: { id: userId, email },
      profile: profile
        ? {
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            avatar_url: profile.avatar_url,
            role: profile.role,
            subscription_status: profile.subscription_status,
          }
        : null,
      subscription,
      alerts: alertsRes.data ?? [],
      savedSearches: searchesRes.data ?? [],
      watchlist: watchRes.data ?? [],
    };
  }

  /** Deletes the auth user; related rows cascade where FKs are configured. */
  static async deleteAuthUser(userId: string): Promise<void> {
    const admin = this.adminDb();
    const { error } = await admin.auth.admin.deleteUser(userId);

    if (error) {
      this.handleError("AccountRepository.deleteAuthUser", error);
    }
  }
}
