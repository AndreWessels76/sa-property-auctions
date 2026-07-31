import type { MetadataRoute } from "next";
import { createSupabaseClient } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  const now = new Date();

  const staticPaths: {
    path: string;
    priority: number;
    changeFrequency: NonNullable<MetadataRoute.Sitemap[0]["changeFrequency"]>;
  }[] = [
    { path: "/", priority: 1, changeFrequency: "hourly" },
    { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
    { path: "/login", priority: 0.4, changeFrequency: "monthly" },
    { path: "/register", priority: 0.5, changeFrequency: "monthly" },
    { path: "/terms", priority: 0.4, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.4, changeFrequency: "yearly" },
    { path: "/popia", priority: 0.4, changeFrequency: "yearly" },
    { path: "/cookies", priority: 0.3, changeFrequency: "yearly" },
    { path: "/subscription-policy", priority: 0.4, changeFrequency: "yearly" },
    { path: "/refunds", priority: 0.4, changeFrequency: "yearly" },
    { path: "/disclaimer", priority: 0.4, changeFrequency: "yearly" },
    { path: "/privacy-requests", priority: 0.3, changeFrequency: "yearly" },
    { path: "/known-issues", priority: 0.3, changeFrequency: "weekly" },
    { path: "/release-notes", priority: 0.4, changeFrequency: "weekly" },
  ];

  const entries: MetadataRoute.Sitemap = staticPaths.map(
    ({ path, priority, changeFrequency }) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    }),
  );

  try {
    const db = createSupabaseClient();
    const { data } = await db
      .from("properties")
      .select("id, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500);

    for (const row of data ?? []) {
      entries.push({
        url: `${base}/properties/${row.id}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : now,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
  } catch {
    // Sitemap should still return static routes if DB is unavailable.
  }

  return entries;
}
