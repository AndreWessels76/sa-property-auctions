import type { CurrentProfile } from "./profileTypes";

export const profileCache = new Map<string, CurrentProfile>();

export function clearCachedProfile(userId?: string) {
  if (userId) {
    profileCache.delete(userId);
    return;
  }

  profileCache.clear();
}
