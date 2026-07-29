import { ROLES, type Role } from "./roles";

export const PERMISSIONS: Record<Role, string[]> = {
  [ROLES.guest]: ["properties:view"],
  [ROLES.user]: [
    "properties:view",
    "favourites:manage",
    "searches:save",
    "profile:edit",
  ],
  [ROLES.premium]: [
    "properties:view",
    "favourites:manage",
    "searches:save",
    "profile:edit",
    "alerts:advanced",
    "reports:view",
    "valuation",
    "heatmaps",
  ],
  [ROLES.admin]: ["*"],
};
