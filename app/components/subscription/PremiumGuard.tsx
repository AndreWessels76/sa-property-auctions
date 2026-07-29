"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/app/components/auth/AuthProvider";
import UpgradePrompt from "@/app/components/auth/UpgradePrompt";
import {
  isPremiumStatus,
  type SubscriptionStatus,
} from "@/lib/subscription";
import { ROLES } from "@/lib/permissions/roles";

type PremiumGuardProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

function hasPremiumAccess(
  subscription: SubscriptionStatus | null,
  role: string,
) {
  // Admins retain full access. Paid access is status-driven only —
  // never grant from a stale profiles.role = "premium".
  if (role === ROLES.admin) {
    return true;
  }

  return isPremiumStatus(subscription);
}

export default function PremiumGuard({
  children,
  fallback,
}: PremiumGuardProps) {
  const { subscription, role, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!hasPremiumAccess(subscription, role)) {
    return fallback ?? <UpgradePrompt />;
  }

  return <>{children}</>;
}
