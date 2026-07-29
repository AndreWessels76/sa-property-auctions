"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { formatErrorMessage } from "@/lib/errors/formatError";

type ProfileFormProps = {
  initialFirstName?: string;
  initialLastName?: string;
};

export default function ProfileForm({
  initialFirstName = "",
  initialLastName = "",
}: ProfileFormProps) {
  const { profile, updateProfile } = useAuth();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? "");
      setLastName(profile.last_name ?? "");
      return;
    }

    if (initialFirstName || initialLastName) {
      setFirstName(initialFirstName);
      setLastName(initialLastName);
    }
  }, [profile, initialFirstName, initialLastName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      setMessage("Profile updated.");
    } catch (err) {
      setError(formatErrorMessage(err, "Failed to update profile"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-white p-6"
    >
      <h2 className="mb-4 text-xl font-bold">Profile</h2>

      <input
        placeholder="First Name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        className="mb-3 w-full rounded border p-3"
      />

      <input
        placeholder="Last Name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        className="mb-4 w-full rounded border p-3"
      />

      {error ? (
        <p className="mb-3 text-sm text-red-600">{error}</p>
      ) : null}

      {message ? (
        <p className="mb-3 text-sm text-emerald-600">{message}</p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded bg-navy-900 px-4 py-2 text-white disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
