/**
 * Validação de arquivos de mídia importados.
 *
 * Não confiamos apenas na extensão: validamos mimeType e tamanho.
 * A leitura de metadata real (duração/dimensões) fica em media.ts, pois
 * depende do browser (HTMLMediaElement).
 */

import type { AssetType } from "@/types";

export const MAX_LOCAL_FILE_SIZE = 500 * 1024 * 1024; // 500 MB (processamento local)

export const ACCEPTED_MIME: Record<AssetType, string[]> = {
  video: ["video/mp4", "video/quicktime", "video/webm"],
  audio: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/aac"],
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
};

export interface ValidationResult {
  ok: boolean;
  type?: AssetType;
  error?: string;
}

/** Descobre o tipo de asset a partir do mimeType, ou null se não suportado. */
export function detectAssetType(mimeType: string): AssetType | null {
  const mime = mimeType.toLowerCase();
  for (const type of Object.keys(ACCEPTED_MIME) as AssetType[]) {
    if (ACCEPTED_MIME[type].includes(mime)) return type;
  }
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("image/")) return "image";
  return null;
}

export interface FileLike {
  name: string;
  type: string;
  size: number;
}

/** Valida um arquivo antes de criar um Asset. */
export function validateMediaFile(file: FileLike): ValidationResult {
  if (!file.type) {
    return { ok: false, error: "Não foi possível identificar o tipo do arquivo." };
  }
  const type = detectAssetType(file.type);
  if (!type) {
    return { ok: false, error: "Formato não suportado." };
  }
  if (file.size <= 0) {
    return { ok: false, error: "Arquivo vazio ou inválido." };
  }
  if (file.size > MAX_LOCAL_FILE_SIZE) {
    return {
      ok: false,
      error: "Arquivo muito grande para processamento local.",
    };
  }
  return { ok: true, type };
}
