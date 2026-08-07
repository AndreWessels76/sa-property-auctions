import { redirect } from "next/navigation";

/** Watchlist lives in Investor Workspace (premium). */
export default function WatchlistPage() {
  redirect("/workspace");
}
