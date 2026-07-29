import { downloadImage } from "./downloadImage";
import { validateImage } from "./imageValidator";

export async function downloadImages(
  urls: string[]
) {

  const images = [];

  for (const url of urls) {

    try {

      const blob =
        await downloadImage(url);

      const validation =
        await validateImage(blob);

      if (!validation.valid) {

        console.warn(
          validation.errors
        );

        continue;

      }

      images.push({
        url,
        blob,
        validation,
      });

    } catch (err) {

      console.error(err);

    }

  }

  return images;

}
