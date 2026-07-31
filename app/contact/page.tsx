import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import SupportRequestForm from "@/components/support/SupportRequestForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact SA Property Auctions support during public beta.",
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24">
        <div className="mx-auto max-w-2xl space-y-6 px-6 py-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gold-600">
              Support
            </p>
            <h1 className="mt-2 text-4xl font-bold text-navy-900">Contact</h1>
            <p className="mt-3 text-slate-600">
              Email{" "}
              <a
                className="font-medium text-navy-900 underline"
                href="mailto:info@sapropertyauctions.co.za"
              >
                info@sapropertyauctions.co.za
              </a>{" "}
              or use the form below. Public beta support is email-first.
            </p>
          </div>
          <SupportRequestForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
