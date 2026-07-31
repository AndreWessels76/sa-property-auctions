import { AccountRepository } from "@/lib/repositories/AccountRepository";
import { SessionService } from "@/lib/auth/SessionService";
import { LoggerService } from "@/lib/logger";
import { ApiError } from "@/lib/api/http";
import { createClient } from "@/lib/supabase/server";

export type SupportRequestInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
  type: "contact" | "privacy";
  category?: string;
};

export class AccountService {
  static async exportMyData() {
    const user = await SessionService.requireUser();
    const payload = await AccountRepository.exportForUser(
      user.id,
      user.email ?? null,
    );

    LoggerService.audit("account.export", { userId: user.id });
    return payload;
  }

  static async deleteMyAccount(confirmation: string) {
    const user = await SessionService.requireUser();

    if (confirmation !== "DELETE") {
      throw new ApiError(
        400,
        "Type DELETE to confirm account deletion",
      );
    }

    LoggerService.audit("account.delete.requested", {
      userId: user.id,
      email: user.email ?? null,
    });

    await AccountRepository.deleteAuthUser(user.id);

    const supabase = await createClient();
    await supabase.auth.signOut();

    LoggerService.audit("account.delete.completed", { userId: user.id });
    return { ok: true as const };
  }

  static async submitSupportRequest(input: SupportRequestInput) {
    const name = input.name.trim().slice(0, 120);
    const email = input.email.trim().slice(0, 200);
    const subject = input.subject.trim().slice(0, 200);
    const message = input.message.trim().slice(0, 4000);
    const category = (input.category ?? "general").trim().slice(0, 80);

    if (!name || !email || !subject || !message) {
      throw new ApiError(400, "All fields are required");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "Enter a valid email address");
    }

    const user = await SessionService.currentUser();

    LoggerService.audit("support.request", {
      type: input.type,
      category,
      name,
      email,
      subject,
      message,
      userId: user?.id ?? null,
    });

    // Manual ops process: monitor structured logs / email inbox during beta.
    return {
      ok: true as const,
      reference: `SR-${Date.now().toString(36).toUpperCase()}`,
    };
  }
}
