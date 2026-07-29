"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resendVerification } from "@/lib/auth/resendVerification";

export default function VerifyEmailCard() {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(emailFromQuery);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasEmail = useMemo(() => email.trim().length > 0, [email]);

  async function handleResend(e: FormEvent) {
    e.preventDefault();

    if (!hasEmail) {
      setError("Enter the email you registered with.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const { error: resendError } = await resendVerification(email.trim());

    if (resendError) {
      setError(resendError.message);
    } else {
      setMessage(
        "Verification email sent. Check your inbox and spam folder. The link expires after a limited time — request a new one if needed.",
      );
    }

    setLoading(false);
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
      <h1 className="text-2xl font-bold text-navy-900">Verify your email</h1>

      <p className="mt-4 text-slate-600">
        We sent a verification link to your email. Click it before signing in.
        If the link expired, resend a new verification email below.
      </p>

      <form onSubmit={handleResend} className="mt-6 space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-navy-900 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Sending..." : "Resend verification email"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already verified?{" "}
        <Link
          href="/login"
          className="font-semibold text-navy-900 underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
