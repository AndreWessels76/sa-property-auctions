import { ProfileService } from "@/lib/auth/ProfileService";
import type { CurrentProfile } from "@/lib/auth/profileTypes";
import { jsonError, jsonOk } from "@/lib/api/http";

export async function PATCH(request: Request) {
  try {
    const updates = (await request.json()) as Partial<CurrentProfile>;
    const profile = await ProfileService.saveProfile(updates);

    return jsonOk(profile);
  } catch (error) {
    return jsonError(error, "Failed to save profile");
  }
}
