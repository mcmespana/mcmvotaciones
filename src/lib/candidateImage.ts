import { supabase } from "@/lib/supabase";
import { errorLog } from "@/lib/logger";

const BUCKET = "candidate-photos";
const MAX_DIMENSION = 900;
const JPEG_QUALITY = 0.85;

/** Máximo aceptado antes de comprimir (fotos de móvil pueden ser enormes). */
export const MAX_IMAGE_INPUT_BYTES = 15 * 1024 * 1024;

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * Reduce la imagen a un máximo de 900px y la recomprime a JPEG para que
 * las listas de candidatas no carguen fotos de varios MB.
 * Si el navegador no puede decodificar el formato, devuelve el archivo original.
 */
async function compressImage(file: File): Promise<{ blob: Blob; contentType: string; ext: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d no disponible");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob falló"))), "image/jpeg", JPEG_QUALITY);
    });
    return { blob, contentType: "image/jpeg", ext: "jpg" };
  } catch (e) {
    errorLog(e);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    return { blob: file, contentType: file.type || "image/jpeg", ext };
  }
}

/** Sube la foto al bucket y devuelve la URL pública. Lanza si falla la subida. */
export async function uploadCandidateImage(file: File, roundId: string): Promise<string> {
  const { blob, contentType, ext } = await compressImage(file);
  const path = `${roundId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Borra del Storage una foto por su URL pública. Ignora URLs externas y la
 * carpeta `shared/` (fotos del CRM reutilizadas entre rondas). Nunca lanza.
 */
export async function removeCandidateImage(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl || !imageUrl.includes(`${BUCKET}/`)) return;
  const path = decodeURIComponent(imageUrl.split(`${BUCKET}/`)[1] || "").split("?")[0];
  if (!path || path.startsWith("shared/")) return;
  try {
    await supabase.storage.from(BUCKET).remove([path]);
  } catch (e) {
    errorLog(e);
  }
}
