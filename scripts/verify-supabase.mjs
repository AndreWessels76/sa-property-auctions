import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  if (!existsSync(".env.local")) {
    console.error(
      "No .env.local file found.\n" +
        "Copy .env.local.example to .env.local and add your Supabase credentials.",
    );
    process.exit(1);
  }

  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (key) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    "Missing Supabase environment variables in .env.local.\n" +
      "Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
  process.exit(1);
}

if (url.includes("your-project-ref") || anonKey.includes("your-anon-key")) {
  console.error(
    "Replace the placeholder values in .env.local with your real Supabase credentials.",
  );
  process.exit(1);
}

const projectUrl = url.replace(/\/rest\/v1\/?$/, "");
const supabase = createClient(projectUrl, anonKey);
const { error } = await supabase.from("properties").select("id").limit(1);

if (error) {
  console.error("Supabase connection failed:", error.message);
  if (error.details) console.error(error.details);
  process.exit(1);
}

console.log("Supabase connection verified successfully.");
console.log(`Project URL: ${projectUrl}`);
