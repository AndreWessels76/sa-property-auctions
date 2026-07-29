import type { CurrentProfile } from "@/lib/auth/profileTypes";
import type { UserDTO } from "@/lib/dto/UserDTO";

export class UserMapper {
  static toDTO(profile: CurrentProfile): UserDTO {
    return {
      id: profile.id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      avatarUrl: profile.avatar_url,
      role: profile.role,
      subscriptionStatus: profile.subscription_status,
    };
  }
}
