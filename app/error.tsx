"use client";

import { useEffect } from "react";
import Link from "next/link";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // Client error boundary — surface for runtime monitoring hooks later.
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-navy-900">Something went wrong</h1>
        <p className="mt-4 text-slate-500">
          An unexpected error occurred. Please try again.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-navy-900 px-6 py-3 font-semibold text-white transition hover:bg-navy-800"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-slate-200 px-6 py-3 font-semibold text-navy-900 transition hover:bg-slate-50"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
