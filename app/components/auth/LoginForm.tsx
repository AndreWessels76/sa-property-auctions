"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PasswordInput from "./PasswordInput";
import RememberMe from "./RememberMe";
import {
  clearRememberedEmail,
  getRememberedEmail,
  setRememberedEmail,
} from "@/lib/auth/rememberMe";
import { signIn } from "@/lib/auth/signIn";
import { safeNextPath } from "@/lib/auth/redirects";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const rememberedEmail = getRememberedEmail();

    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRemember(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { data, error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setError("Sign in failed. Please try again.");
      setLoading(false);
      return;
    }

    if (remember) {
      setRememberedEmail(email.trim());
    } else {
      clearRememberedEmail();
    }

    router.push(safeNextPath(searchParams.get("next")));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded border p-3"
      />

      <PasswordInput value={password} onChange={setPassword} />

      <RememberMe checked={remember} onChange={setRemember} />

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <button
        disabled={loading}
        className="w-full rounded bg-blue-600 py-3 text-white"
      >
        {loading ? "Signing in..." : "Login"}
      </button>
    </form>
  );
}
