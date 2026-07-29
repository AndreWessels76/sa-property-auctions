import { supabase } from "@/lib/supabase";

export async function setHeroImage(
  propertyId: string,
  hero: string,
  medium: string,
  thumb: string,
  blur: string
) {

  await supabase
    .from("properties")
    .update({
      hero_image: hero,
      medium_image: medium,
      thumbnail_image: thumb,
      blur_placeholder: blur,
    })
    .eq(
      "id",
      propertyId
    );

}
