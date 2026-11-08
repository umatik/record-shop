/**
 * Zmniejsza zdjęcie z telefonu przed wysłaniem: dłuższy bok najwyżej `maxSide` px, JPEG.
 * Szybciej się wysyła, mieści w limicie API (5 MB) i taniej czyta je Claude.
 */
export async function shrinkPhoto(file: File, maxSide = 2000, quality = 0.85): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}
