"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth/signUp";
import { completeProfile } from "@/lib/auth/completeProfile";
import PasswordInput from "./PasswordInput";
import ConfirmPasswordInput from "./ConfirmPasswordInput";
import PasswordStrength from "./PasswordStrength";
import TermsCheckbox from "./TermsCheckbox";

export default function RegisterForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (!terms) {
      setMessage("Please accept the Terms & Conditions.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await signUp(email, password, {
      firstName,
      lastName,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    // With confirm-email ON, session may be null until verified.
    // Names are stored on user_metadata via signUp; complete profile when session exists.
    if (data.session) {
      await completeProfile(firstName, lastName);
    }

    const params = new URLSearchParams({ email });
    router.push(`/verify-email?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        placeholder="First Name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        className="w-full rounded border p-3"
        required
      />

      <input
        placeholder="Last Name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        className="w-full rounded border p-3"
        required
      />

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded border p-3"
        required
      />

      <PasswordInput value={password} onChange={setPassword} />

      <PasswordStrength password={password} />

      <ConfirmPasswordInput
        password={password}
        confirmPassword={confirmPassword}
        onChange={setConfirmPassword}
      />

      <TermsCheckbox checked={terms} onChange={setTerms} />

      {message ? (
        <div className="rounded border p-3 text-sm">{message}</div>
      ) : null}

      <button
        disabled={loading}
        className="w-full rounded bg-blue-600 py-3 text-white"
      >
        {loading ? "Creating account..." : "Create Account"}
      </button>
    </form>
  );
}
