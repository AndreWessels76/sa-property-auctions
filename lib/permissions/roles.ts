export const ROLES = {
  guest: "guest",
  user: "user",
  premium: "premium",
  admin: "admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
