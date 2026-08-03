import "server-only";

import { downloadImage } from "./downloadImage";
import { blobToFile } from "./blobToFile";
import { uploadPropertyImageServer } from "./storage.server";
import { saveImageServer } from "./imageService.server";

export async function processImage(
  propertyId: string,
  imageUrl: string,
  source: string,
) {
  const blob = await downloadImage(imageUrl);
  const file = blobToFile(blob, "image.jpg");
  const publicUrl = await uploadPropertyImageServer(file, propertyId);
  await saveImageServer(propertyId, publicUrl, false, source);
  return publicUrl;
}
