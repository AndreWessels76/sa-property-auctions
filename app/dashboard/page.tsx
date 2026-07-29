"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingGuard from "@/app/components/auth/LoadingGuard";
import { useAuth } from "@/app/components/auth/AuthProvider";
import Dashboard from "@/app/components/dashboard/Dashboard";
import DashboardSkeleton from "@/app/components/dashboard/DashboardSkeleton";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, role, subscription, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (!user) {
    return null;
  }

  return (
    <>
      <Header />
      <LoadingGuard loading={loading} fallback={<DashboardSkeleton />}>
        <Dashboard
          user={user}
          profile={profile}
          role={role}
          subscription={subscription}
        />
      </LoadingGuard>
      <Footer />
    </>
  );
}
