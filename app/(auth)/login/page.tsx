import { Suspense } from "react";
import LoginCard from "@/app/components/auth/LoginCard";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <Suspense fallback={<div className="text-sm text-slate-500">Loading...</div>}>
        <LoginCard />
      </Suspense>
    </main>
  );
}
