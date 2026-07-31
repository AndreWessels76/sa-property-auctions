import { redirect } from "next/navigation";

/** Overview with hardcoded stats removed for beta — use real dashboard. */
export default function AdminPage() {
  redirect("/admin/dashboard");
}
