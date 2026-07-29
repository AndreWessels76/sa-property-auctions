import { PERMISSIONS } from "./permissions";
import type { Role } from "./roles";

export function hasPermission(role: string, permission: string) {
  const permissions = PERMISSIONS[role as Role];

  if (!permissions) {
    return false;
  }

  if (permissions.includes("*")) {
    return true;
  }

  return permissions.includes(permission);
}
