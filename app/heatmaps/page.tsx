import { redirect } from "next/navigation";

/**
 * Heatmaps are not ready for closed beta.
 * Implementation retained under app/components/heatmap for a future release.
 */
export default function HeatmapsPage() {
  redirect("/coming-soon");
}
