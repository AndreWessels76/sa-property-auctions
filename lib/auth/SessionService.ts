import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export class SessionService {
  static async currentUser(): Promise<User | null> {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  }

  static async requireAuth(): Promise<User> {
    const user = await this.currentUser();

    if (!user) {
      throw new Error("Authentication required");
    }

    return user;
  }

  /** Alias for `currentUser()`. */
  static getUser() {
    return this.currentUser();
  }

  /** Alias for `requireAuth()`. */
  static requireUser() {
    return this.requireAuth();
  }
}
