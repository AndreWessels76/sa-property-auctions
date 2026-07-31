import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProfileCard from "@/components/profile/ProfileCard";
import ProfileForm from "@/components/profile/ProfileForm";
import ExportDataCard from "@/components/profile/ExportDataCard";
import DeleteAccountCard from "@/components/profile/DeleteAccountCard";
import { SubscriptionCard } from "@/app/components/subscription";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { getProfile } from "@/lib/auth/profile";
import { SessionService } from "@/lib/auth/SessionService";
import { SubscriptionService } from "@/lib/subscription/SubscriptionService";

export default async function ProfilePage() {
  const profile = await getProfile();
  const user = await SessionService.currentUser();
  const subscription = user
    ? await SubscriptionService.get(user.id).catch(() => null)
    : null;

  const planId = subscription?.subscription_plan ?? "free";
  const planMeta = SubscriptionService.planLimits(planId);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24">
        <div className="mx-auto max-w-5xl space-y-6 px-6 py-12">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-navy-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>

          <div>
            <h1 className="text-3xl font-bold text-navy-900">Your profile</h1>
            <p className="mt-2 text-slate-500">
              Update your account details, export your data, or delete your
              account.
            </p>
          </div>

          <ProfileCard />
          <ProfileForm
            initialFirstName={profile?.first_name ?? ""}
            initialLastName={profile?.last_name ?? ""}
          />

          <SubscriptionCard
            plan={planMeta.name}
            status={subscription?.subscription_status ?? "inactive"}
            expiresAt={subscription?.subscription_expires_at}
          />

          {planId === "free" ? (
            <p className="text-sm text-slate-500">
              Want unlimited access?{" "}
              <Link href="/pricing" className="font-medium text-navy-900 underline">
                View pricing
              </Link>
            </p>
          ) : null}

          <ExportDataCard />

          <p className="text-sm text-slate-500">
            Need help or a privacy request?{" "}
            <Link href="/contact" className="font-medium text-navy-900 underline">
              Contact support
            </Link>{" "}
            or{" "}
            <Link
              href="/privacy-requests"
              className="font-medium text-navy-900 underline"
            >
              Privacy requests
            </Link>
            .
          </p>

          <DeleteAccountCard />
        </div>
      </main>
      <Footer />
    </>
  );
}
