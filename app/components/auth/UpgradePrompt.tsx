import Link from "next/link";

export default function UpgradePrompt() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
      <h3 className="text-lg font-semibold text-amber-900">
        Upgrade required
      </h3>
      <p className="mt-2 text-sm text-amber-800">
        This feature is available on a premium plan.
      </p>
      <Link
        href="/profile"
        className="mt-4 inline-block rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white"
      >
        View plans
      </Link>
    </div>
  );
}
