import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  getInvalidEnvVars,
  getMissingEnvVars,
} from "@/lib/env/validateEnv";
import { LoggerService } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Readiness — required env + database reachability via service role
 * (avoids false 503s from RLS on the anon client).
 */
export async function GET() {
  const missing = getMissingEnvVars();
  const invalid = getInvalidEnvVars();
  const checks: Record<string, "ok" | "fail"> = {
    env: missing.length === 0 && invalid.length === 0 ? "ok" : "fail",
    database: "fail",
    stripe: process.env.STRIPE_SECRET_KEY ? "ok" : "fail",
  };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);
    checks.database = error ? "fail" : "ok";

    if (error) {
      LoggerService.error("Readiness database check failed", {
        error: error.message,
      });
    }
  } catch (error) {
    LoggerService.error("Readiness database check failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    checks.database = "fail";
  }

  const ready = Object.values(checks).every((value) => value === "ok");

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      checks,
      // Avoid leaking exact env names to anonymous clients in production.
      ...(process.env.NODE_ENV !== "production"
        ? { missingEnv: missing, invalidEnv: invalid }
        : {}),
      time: new Date().toISOString(),
    },
    { status: ready ? 200 : 503 },
  );
}
