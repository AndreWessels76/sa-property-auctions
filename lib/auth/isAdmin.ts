import { getCurrentRole } from "./getCurrentRole";
import { ROLES } from "@/lib/permissions/roles";

export async function isAdmin(): Promise<boolean> {
  return (await getCurrentRole()) === ROLES.admin;
}
