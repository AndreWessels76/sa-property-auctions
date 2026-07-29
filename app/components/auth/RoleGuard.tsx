"use client";

import { useAuth } from "./AuthProvider";
import { hasPermission } from "@/lib/permissions/permissionService";
import type { Role } from "@/lib/permissions/roles";
import PermissionGuard from "./PermissionGuard";

type RoleGuardProps = {
  permission: string;
  role?: Role;
  children: React.ReactNode;
};

/**
 * Authorization against the profile role from AuthProvider.
 * Do not use for Premium features — use PremiumGuard / SubscriptionService.
 * Remaining use case: Admin (and other non-premium) permission gates.
 */
export default function RoleGuard({
  permission,
  role,
  children,
}: RoleGuardProps) {
  const { role: profileRole } = useAuth();
  const resolvedRole = role ?? profileRole;

  return (
    <PermissionGuard allowed={hasPermission(resolvedRole, permission)}>
      {children}
    </PermissionGuard>
  );
}
