import { supabase } from "@/lib/supabase";
import { getImages } from "./getImages";
import { selectHeroImage } from "./selectHero";

export async function markHeroAsPrimary(propertyId: string) {
  const images = await getImages(propertyId);
  const hero = selectHeroImage(images);

  if (!hero?.id) return null;

  await supabase
    .from("property_images")
    .update({ is_primary: false })
    .eq("property_id", propertyId);

  await supabase
    .from("property_images")
    .update({ is_primary: true })
    .eq("id", hero.id);

  if (hero.storage_path || hero.image_url) {
    await supabase
      .from("properties")
      .update({
        hero_image: hero.storage_path ?? hero.image_url,
      })
      .eq("id", propertyId);
  }

  return hero;
}
