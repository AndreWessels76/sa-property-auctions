import { SessionService } from "@/lib/auth/SessionService";
import { BillingService } from "@/lib/billing/CheckoutService";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import { LoggerService } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const user = await SessionService.requireUser();

    const limited = rateLimit({
      key: `billing:portal:${user.id}:${clientIp(request)}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (limited) {
      return limited;
    }

    const session = await BillingService.openPortal(user.id);

    LoggerService.stripe("Portal session created", { userId: user.id });

    return jsonOk(session);
  } catch (error) {
    return jsonError(error, "Portal session failed");
  }
}
