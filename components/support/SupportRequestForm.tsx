"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  defaultType?: "contact" | "privacy";
  defaultCategory?: string;
  title?: string;
  intro?: string;
};

export default function SupportRequestForm({
  defaultType = "contact",
  defaultCategory = "general",
  title = "Contact support",
  intro = "Send a message to the SA Property Auctions team. During public beta we respond by email.",
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setReference(null);
    setPending(true);
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          type: defaultType,
          category,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        reference?: string;
        ok?: boolean;
      };
      if (!response.ok) {
        throw new Error(data.error || "Submission failed");
      }
      setReference(data.reference ?? "received");
      setMessage("");
      setSubject("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setPending(false);
    }
  }

  const fieldClass =
    "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-navy-900";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-navy-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{intro}</p>
      {reference ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Request received (ref {reference}). We will follow up by email. See
          also our <Link href="/faq" className="underline">FAQ</Link>.
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        {defaultType === "privacy" ? (
          <label className="block text-sm font-medium text-slate-700">
            Request type
            <select
              className={fieldClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="access">Access my personal information</option>
              <option value="correction">Correct my information</option>
              <option value="deletion">Request deletion</option>
              <option value="objection">Object to processing</option>
              <option value="other">Other privacy matter</option>
            </select>
          </label>
        ) : null}
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input
            className={fieldClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            className={fieldClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={200}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Subject
          <input
            className={fieldClass}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            maxLength={200}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Message
          <textarea
            className={fieldClass}
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            maxLength={4000}
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Submit"}
        </button>
      </form>
    </div>
  );
}
