function typeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "image/jpeg";
}

export function blobToFile(blob: Blob, filename: string) {
  const type =
    blob.type && blob.type !== "application/octet-stream"
      ? blob.type
      : typeFromFilename(filename);

  return new File([blob], filename, { type });
}
