import Link from "next/link";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export const metadata = {
  title: "Coming soon",
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <>
      <Header />
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 pt-24">
        <div className="max-w-lg rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-gold-600">
            Coming soon
          </p>
          <h1 className="mt-3 text-3xl font-bold text-navy-900">
            This feature is not available yet
          </h1>
          <p className="mt-4 text-slate-500">
            We are still finishing this experience. Browse live auctions in the
            meantime.
          </p>
          <Link
            href="/#featured"
            className="mt-8 inline-block rounded-xl bg-navy-900 px-6 py-3 font-semibold text-white hover:bg-navy-800"
          >
            Browse auctions
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
