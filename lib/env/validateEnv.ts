import { LoggerService } from "@/lib/logger";

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_MONTHLY",
  "STRIPE_PRICE_YEARLY",
  "NEXT_PUBLIC_SITE_URL",
] as const;

export type RequiredEnvKey = (typeof REQUIRED_ENV)[number];

export function getMissingEnvVars(
  keys: readonly string[] = REQUIRED_ENV,
): string[] {
  return keys.filter((key) => {
    const value = process.env[key];
    return !value || value.trim().length === 0;
  });
}

export function getInvalidEnvVars(): string[] {
  const invalid: string[] = [];
  const monthly = process.env.STRIPE_PRICE_MONTHLY?.trim();
  const yearly = process.env.STRIPE_PRICE_YEARLY?.trim();

  if (monthly && yearly && monthly === yearly) {
    invalid.push(
      "STRIPE_PRICE_MONTHLY and STRIPE_PRICE_YEARLY must be different Price IDs",
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (
    process.env.NODE_ENV === "production" &&
    siteUrl &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(siteUrl)
  ) {
    invalid.push(
      "NEXT_PUBLIC_SITE_URL must be the public HTTPS origin in production",
    );
  }

  return invalid;
}

/**
 * Fail-fast validation for production boot.
 * In development, logs warnings instead of throwing (except when force=true).
 */
export function validateEnv(options?: { force?: boolean }) {
  const missing = getMissingEnvVars();
  const invalid = getInvalidEnvVars();
  const force =
    options?.force ?? process.env.NODE_ENV === "production";

  if (missing.length === 0 && invalid.length === 0) {
    return { ok: true as const, missing: [] as string[], invalid: [] as string[] };
  }

  const parts = [
    missing.length
      ? `Missing or empty: ${missing.join(", ")}`
      : null,
    invalid.length ? invalid.join("; ") : null,
  ].filter(Boolean);

  const message = `Environment validation failed: ${parts.join(" | ")}`;

  if (force) {
    LoggerService.error(message);
    throw new Error(message);
  }

  LoggerService.warn(message);
  return { ok: false as const, missing, invalid };
}
