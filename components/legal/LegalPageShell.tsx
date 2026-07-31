import Link from "next/link";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

type Props = {
  title: string;
  subtitle?: string;
  updated?: string;
  children: React.ReactNode;
};

export default function LegalPageShell({
  title,
  subtitle,
  updated = "31 July 2026",
  children,
}: Props) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24">
        <article className="mx-auto max-w-3xl px-6 py-12">
          <p className="text-sm font-semibold uppercase tracking-wide text-gold-600">
            Legal
          </p>
          <h1 className="mt-2 text-3xl font-bold text-navy-900 sm:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 text-slate-600">{subtitle}</p>
          ) : null}
          <p className="mt-2 text-sm text-slate-500">
            Last updated: {updated}
          </p>
          <div className="prose-legal mt-10 space-y-8 text-slate-700 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-navy-900 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-navy-900 [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed [&_ul]:space-y-2">
            {children}
          </div>
          <p className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
            Questions? See our{" "}
            <Link href="/contact" className="font-medium text-navy-900 underline">
              Contact
            </Link>{" "}
            page or email{" "}
            <a
              href="mailto:info@sapropertyauctions.co.za"
              className="font-medium text-navy-900 underline"
            >
              info@sapropertyauctions.co.za
            </a>
            .
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}
