import { NextResponse } from "next/server";
import { SessionService } from "@/lib/auth/SessionService";
import { BillingService } from "@/lib/billing/CheckoutService";
import type { BillingInterval } from "@/lib/billing/BillingTypes";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import { LoggerService } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const user = await SessionService.requireUser();

    const limited = rateLimit({
      key: `billing:checkout:${user.id}:${clientIp(req)}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (limited) {
      return limited;
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "User email is required for checkout" },
        { status: 400 },
      );
    }

    const body = (await req.json()) as { interval?: BillingInterval };
    const interval = body.interval;

    if (interval !== "monthly" && interval !== "yearly") {
      return NextResponse.json(
        { error: "Invalid billing interval" },
        { status: 400 },
      );
    }

    const session = await BillingService.startCheckout(
      user.id,
      user.email,
      interval,
    );

    LoggerService.stripe("Checkout session created", {
      userId: user.id,
      interval,
    });

    return jsonOk(session);
  } catch (error) {
    return jsonError(error, "Checkout failed");
  }
}
