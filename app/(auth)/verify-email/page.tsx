import { Suspense } from "react";
import VerifyEmailCard from "@/app/components/auth/VerifyEmailCard";

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <Suspense
        fallback={<div className="text-sm text-slate-500">Loading...</div>}
      >
        <VerifyEmailCard />
      </Suspense>
    </main>
  );
}
