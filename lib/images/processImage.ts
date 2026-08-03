import "server-only";

import { downloadImage } from "./downloadImage";
import { blobToFile } from "./blobToFile";
import { uploadPropertyImageServer } from "./storage.server";
import { saveImageServer } from "./imageService.server";

function filenameFromUrl(imageUrl: string): string {
  try {
    const path = new URL(imageUrl).pathname;
    const base = path.split("/").pop() || "image.jpg";
    if (/\.(jpe?g|png|webp|gif)$/i.test(base)) return base;
    return "image.jpg";
  } catch {
    return "image.jpg";
  }
}

/**
 * Download → storage upload → DB row.
 * Falls back to hotlinked source URL when storage rejects the blob,
 * so verified listings still retain a displayable gallery.
 */
export async function processImage(
  propertyId: string,
  imageUrl: string,
  source: string,
) {
  try {
    const blob = await downloadImage(imageUrl);
    const file = blobToFile(blob, filenameFromUrl(imageUrl));
    const publicUrl = await uploadPropertyImageServer(file, propertyId);
    await saveImageServer(propertyId, publicUrl, false, source);
    return publicUrl;
  } catch (storageError) {
    // Fallback: persist source CDN URL (Next remotePatterns allow BC hosts).
    try {
      await saveImageServer(propertyId, imageUrl, false, source);
      return imageUrl;
    } catch {
      throw storageError;
    }
  }
}
