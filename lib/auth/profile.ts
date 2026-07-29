import { ProfileService } from "@/lib/auth/ProfileService";

export async function getProfile() {
  try {
    return await ProfileService.getProfile();
  } catch {
    return null;
  }
}
