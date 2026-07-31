import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Known Issues",
  description: "Known issues for the SA Property Auctions public beta.",
};

const issues = [
  {
    title: "Free-text search and multi-word phrases",
    detail:
      "Manual keyword search may miss titles when the full phrase does not appear in a single field. Prefer filters or Premium AI Search.",
  },
  {
    title: "Catalogue coverage",
    detail:
      "Launch catalogue is a curated starter set across provinces. Licensed live feeds will expand coverage over time.",
  },
  {
    title: "Seed listing photography",
    detail:
      "Some galleries use stock photography for presentation until provider images are available.",
  },
  {
    title: "Heatmaps",
    detail: "Heatmap UI is deferred (Coming soon).",
  },
  {
    title: "Support is email-first",
    detail:
      "Privacy and support forms are logged for operators; responses are handled manually during beta.",
  },
];

export default function KnownIssuesPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <h1 className="text-4xl font-bold text-navy-900">Known issues</h1>
          <p className="mt-3 text-slate-600">
            Transparent status for public beta. See also{" "}
            <Link href="/release-notes" className="underline">
              Release notes
            </Link>
            .
          </p>
          <ul className="mt-10 space-y-6">
            {issues.map((item) => (
              <li
                key={item.title}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <h2 className="font-semibold text-navy-900">{item.title}</h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {item.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
