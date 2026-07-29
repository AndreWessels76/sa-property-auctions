import { getCurrentRole } from "./getCurrentRole";
import { isAdmin } from "./isAdmin";
import { SubscriptionService } from "./SubscriptionService";

export class PermissionService {  static async role() {
    return getCurrentRole();
  }

  static async hasRole(...roles: string[]): Promise<boolean> {
    const role = await this.role();
    return roles.includes(role);
  }

  static async admin() {
    return isAdmin();
  }

  /** Alias for `admin()`. */
  static isAdmin() {
    return this.admin();
  }

  static async requireAdmin(): Promise<void> {
    const admin = await this.admin();

    if (!admin) {
      throw new Error("Admin access required");
    }
  }

  /** Alias — delegates to `SubscriptionService.premium()`. */
  static isPremium() {
    return SubscriptionService.premium();
  }

  /** Alias — delegates to `SubscriptionService.requirePremium()`. */
  static requirePremium() {
    return SubscriptionService.requirePremium();
  }
}