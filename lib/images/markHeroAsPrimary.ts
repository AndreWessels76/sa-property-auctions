import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";
import { getImages } from "./getImages";
import { selectHeroImage } from "./selectHero";

export async function markHeroAsPrimary(propertyId: string) {
  const images = await getImages(propertyId);
  const hero = selectHeroImage(images);

  if (!hero?.id) return null;

  const db = createServiceClient();

  const clear = await db
    .from("property_images")
    .update({ is_primary: false, is_hero: false })
    .eq("property_id", propertyId);
  if (clear.error) {
    throw new Error(`Failed to clear primary flags: ${clear.error.message}`);
  }

  const setPrimary = await db
    .from("property_images")
    .update({ is_primary: true, is_hero: true })
    .eq("id", hero.id);
  if (setPrimary.error) {
    throw new Error(`Failed to set primary image: ${setPrimary.error.message}`);
  }

  const heroUrl = hero.image_url;
  if (heroUrl) {
    const propUpdate = await db
      .from("properties")
      .update({
        hero_image: heroUrl,
        image: heroUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", propertyId);
    if (propUpdate.error) {
      throw new Error(
        `Failed to update property hero: ${propUpdate.error.message}`,
      );
    }
  }

  return hero;
}
