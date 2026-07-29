import { ProfileRepository } from "@/lib/repositories";
import { getUserRole } from "./authGuard";
import { toDatabaseRole } from "./profileRole";
import type { CurrentProfile } from "./profileTypes";
import { SessionService } from "./SessionService";
import { SUBSCRIPTIONS } from "@/lib/subscription";

export class ProfileService {
  static async getProfile() {
    const user = await SessionService.requireUser();

    return ProfileRepository.findById(user.id);
  }

  static async saveProfile(
    updates: Partial<CurrentProfile>,
  ): Promise<CurrentProfile> {
    const user = await SessionService.requireUser();
    const safeUpdates = {
      first_name: updates.first_name,
      last_name: updates.last_name,
      avatar_url: updates.avatar_url,
    };
    const existing = await ProfileRepository.findById(user.id);

    if (existing) {
      return ProfileRepository.update(user.id, safeUpdates);
    }

    const role = toDatabaseRole(getUserRole(user));

    return ProfileRepository.upsert(user.id, {
      ...safeUpdates,
      role,
      subscription_status: SUBSCRIPTIONS.INACTIVE,
    });
  }

  static async updateProfile(updates: Record<string, unknown>) {
    return this.saveProfile(updates);
  }
}
