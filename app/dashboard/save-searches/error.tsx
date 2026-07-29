"use client";

type Props = {
  error: Error;
  reset: () => void;
};

export default function Error({ error, reset }: Props) {
  console.error(error);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6">
      <div className="rounded-3xl border bg-white p-12 text-center shadow-sm">
        <div className="text-6xl">⚠️</div>

        <h1 className="mt-6 text-3xl font-bold">Something went wrong</h1>

        <p className="mt-4 text-slate-500">
          We couldn&apos;t load your saved searches.
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-8 rounded-xl bg-black px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
        >
          Try Again
        </button>
      </div>
    </main>
  );
}
