import { supabase } from "@/lib/supabase";
import { categorizeImage } from "./imageCategorizer";

export async function updateImageCategory(
  imageId: string,
  imageFileName: string
) {

  const category = categorizeImage(
    imageFileName
  );

  await supabase
    .from("property_images")
    .update({
      image_type:
        category.category
    })
    .eq(
      "id",
      imageId
    );

  return category;

}
