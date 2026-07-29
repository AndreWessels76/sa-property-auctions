export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  // Avoid failing `next build` / static generation when secrets are injected at runtime.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  const { validateEnv } = await import("@/lib/env/validateEnv");
  validateEnv({
    force:
      process.env.NODE_ENV === "production" &&
      process.env.SKIP_ENV_VALIDATION !== "1",
  });
}
