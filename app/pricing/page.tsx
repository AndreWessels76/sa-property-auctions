import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui";
import PricingCheckoutButtons from "./PricingCheckoutButtons";

export default function PricingPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="mb-10 max-w-2xl">
            <h1 className="text-4xl font-bold text-navy-900">
              Pricing
            </h1>
            <p className="mt-3 text-slate-600">
              Unlock unlimited searches, alerts, AI insights and
              premium analytics.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h2 className="text-2xl font-bold">Premium Monthly</h2>
              <p className="mt-2 text-slate-500">
                Full access billed monthly. Cancel anytime.
              </p>
              <PricingCheckoutButtons interval="monthly" />
            </Card>

            <Card className="border-blue-500 bg-blue-50">
              <h2 className="text-2xl font-bold">Premium Yearly</h2>
              <p className="mt-2 text-slate-500">
                Full access with annual billing savings.
              </p>
              <PricingCheckoutButtons interval="yearly" />
            </Card>
          </div>

          <p className="mt-8 text-sm text-slate-500">
            Already subscribed?{" "}
            <Link href="/profile" className="font-medium text-navy-900 underline">
              Manage your account
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
