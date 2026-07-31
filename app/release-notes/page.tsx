import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Release Notes",
  description: "Public changelog for SA Property Auctions.",
};

export default function ReleaseNotesPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <h1 className="text-4xl font-bold text-navy-900">Release notes</h1>
          <p className="mt-3 text-slate-600">
            Public beta changelog for SA Property Auctions.
          </p>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-bold text-navy-900">
              Launch 1 — Public Beta Go-Live
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-slate-700">
              <li>Legal &amp; trust pages live across the site footer</li>
              <li>Honest marketing copy (no unverifiable user/listing counts)</li>
              <li>
                Transparent Premium pricing: R99/month · R990/year
              </li>
              <li>Starter catalogue with images across all nine provinces</li>
              <li>Export my data, delete account, contact &amp; privacy requests</li>
            </ul>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-bold text-navy-900">RC5.2.x</h2>
            <ul className="list-disc space-y-2 pl-5 text-slate-700">
              <li>AI Search hotfix (structured filters vs natural-language AND)</li>
              <li>Case-insensitive auction status matching</li>
            </ul>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-bold text-navy-900">Earlier</h2>
            <ul className="list-disc space-y-2 pl-5 text-slate-700">
              <li>Stripe subscriptions, auth, admin imports, health endpoints</li>
              <li>Pagination, property page hardening, robots/sitemap</li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
