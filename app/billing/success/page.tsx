import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button, Card } from "@/components/ui";

export default function BillingSuccessPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24">
        <div className="mx-auto max-w-xl px-6 py-16">
          <Card className="text-center">
            <h1 className="text-3xl font-bold text-navy-900">
              You're Premium
            </h1>
            <p className="mt-3 text-slate-600">
              Your subscription is active. Premium features are now
              unlocked across SA Property Auctions.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/dashboard">
                <Button>Go to dashboard</Button>
              </Link>
              <Link href="/profile">
                <Button variant="secondary">View profile</Button>
              </Link>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
