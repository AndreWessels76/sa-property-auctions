import { supabase } from "@/lib/supabase";

export async function saveBlurPlaceholder(
  imageId: string,
  blur: string
) {

  await supabase
    .from("property_images")
    .update({
      blur_placeholder: blur
    })
    .eq(
      "id",
      imageId
    );

}
