"use server";

import { revalidatePath } from "next/cache";
import { SessionService } from "@/lib/auth/SessionService";
import { SavedSearchService } from "@/lib/services/SavedSearchService";
import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";

export async function getUserSavedSearches(userId: string) {
  const user = await SessionService.requireUser();

  if (user.id !== userId) {
    throw new Error("Unauthorized");
  }

  return SavedSearchService.getUserSearches(user.id);
}

export async function createSavedSearch(
  userId: string,
  name: string,
  filters: PropertySearchDTO,
) {
  await SavedSearchService.createSearch({
    userId,
    name,
    filters,
    active: true,
  });

  revalidatePath("/dashboard/save-searches");
}

export async function renameSavedSearch(id: string, name: string) {
  await SavedSearchService.rename(id, name);

  revalidatePath("/dashboard/save-searches");
}

export async function pauseSavedSearch(id: string) {
  await SavedSearchService.setActive(id, false);

  revalidatePath("/dashboard/save-searches");
}

export async function activateSavedSearch(id: string) {
  await SavedSearchService.setActive(id, true);

  revalidatePath("/dashboard/save-searches");
}

export async function deleteSavedSearch(id: string) {
  await SavedSearchService.delete(id);

  revalidatePath("/dashboard/save-searches");
}
