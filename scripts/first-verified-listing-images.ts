import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

async function main() {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }

  const id = "3e7ea1ff-f237-4a6c-8b36-23bb34c4136c";
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const urls = [
    "https://bidderschoice.co.za/wp-content/uploads/2026/06/Online-Auction-Guest-Farm-Haenertsburg-Magoebaskloof-Limpopo-25-1024x576.jpg",
    "https://bidderschoice.co.za/wp-content/uploads/2026/06/Online-Auction-Guest-Farm-Haenertsburg-Magoebaskloof-Limpopo-16-1024x576.jpg",
    "https://bidderschoice.co.za/wp-content/uploads/2026/06/Online-Auction-Guest-Farm-Haenertsburg-Magoebaskloof-Limpopo-30-1024x576.jpg",
  ];

  const { data: existing } = await db
    .from("property_images")
    .select("id")
    .eq("property_id", id);

  if ((existing?.length ?? 0) > 0) {
    console.log("already", existing?.length);
    return;
  }

  const rows = urls.map((url, i) => ({
    property_id: id,
    image_url: url,
    is_hero: i === 0,
  }));

  const { data, error } = await db
    .from("property_images")
    .insert(rows)
    .select("id,image_url,is_hero");

  console.log(error?.message || `ok ${data?.length}`);
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
