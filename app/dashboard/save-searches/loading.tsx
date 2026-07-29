import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-10">
        <Skeleton className="h-10 w-64" />

        <Skeleton className="mt-4 h-5 w-96" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border bg-white p-6 shadow-sm"
          >
            <Skeleton className="h-4 w-24" />

            <Skeleton className="mt-6 h-10 w-20" />
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border bg-white p-6 shadow-sm"
          >
            <Skeleton className="h-7 w-48" />

            <Skeleton className="mt-4 h-4 w-28" />

            <div className="mt-8 space-y-3">
              {[...Array(5)].map((_, j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, j) => (
                <Skeleton key={j} className="h-10 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
