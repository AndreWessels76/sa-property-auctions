import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import SupportRequestForm from "@/components/support/SupportRequestForm";

export const metadata: Metadata = {
  title: "Privacy Requests",
  description:
    "Submit POPIA privacy requests to SA Property Auctions — access, correction, deletion, and objections.",
};

export default function PrivacyRequestsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24">
        <div className="mx-auto max-w-2xl space-y-6 px-6 py-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gold-600">
              POPIA
            </p>
            <h1 className="mt-2 text-4xl font-bold text-navy-900">
              Privacy requests
            </h1>
            <p className="mt-3 text-slate-600">
              Signed-in users can also{" "}
              <Link href="/profile" className="font-medium text-navy-900 underline">
                export or delete
              </Link>{" "}
              their account from Profile. For other requests, use this form or
              email{" "}
              <a
                className="font-medium text-navy-900 underline"
                href="mailto:privacy@sapropertyauctions.co.za"
              >
                privacy@sapropertyauctions.co.za
              </a>
              .
            </p>
          </div>
          <SupportRequestForm
            defaultType="privacy"
            defaultCategory="access"
            title="Submit a privacy request"
            intro="We may need to verify your identity before fulfilling POPIA requests. Self-service export and deletion are available on your profile when signed in."
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
