import type { Role } from "@/lib/permissions/roles";
import { ROLES } from "@/lib/permissions/roles";

export function toDatabaseRole(role: string | null | undefined): string {
  switch (role) {
    case ROLES.admin:
      return "admin";
    case ROLES.premium:
      return "premium";
    case ROLES.user:
      return "user";
    case ROLES.guest:
    case "free":
      return "free";
    default:
      return "free";
  }
}

export function fromDatabaseRole(raw: unknown): Role {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : undefined;

  switch (value) {
    case "admin":
      return ROLES.admin;
    case "premium":
      return ROLES.premium;
    case "user":
      return ROLES.user;
    case "guest":
    case "free":
      return ROLES.guest;
    default:
      return ROLES.user;
  }
}
