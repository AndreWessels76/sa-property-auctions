"use server";

import { revalidateTag } from "next/cache";

export async function refreshPropertyCache() {
  revalidateTag("properties", "max");
  revalidateTag("property-analysis", "max");
}

export async function refreshPropertyAnalysisCache() {
  revalidateTag("property-analysis", "max");
}
