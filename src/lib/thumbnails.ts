/**
 * Geração de thumbnails de mídia (um frame por asset, com cache).
 *
 * Browser-only (usa HTMLVideoElement/canvas). Para evitar gerar "centenas" de
 * miniaturas (ver seção 33 da spec), cacheamos por assetId e geramos apenas
 * uma vez por asset. Imagens usam a própria fonte como thumbnail.
 */

import type { Asset } from "@/types";

const THUMB_HEIGHT = 72;
const cache = new Map<string, Promise<string>>();

function generateVideoThumbnail(source: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.crossOrigin = "anonymous";
    video.src = source;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      // Um pouco depois do início evita frames pretos iniciais.
      video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
    };
    video.onseeked = () => {
      try {
        const ratio = video.videoWidth / video.videoHeight || 16 / 9;
        const canvas = document.createElement("canvas");
        canvas.height = THUMB_HEIGHT;
        canvas.width = Math.round(THUMB_HEIGHT * ratio);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL("image/jpeg", 0.6);
        cleanup();
        resolve(url);
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error("thumbnail failed"));
      }
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Não foi possível gerar a miniatura do vídeo."));
    };
  });
}

/**
 * Retorna (com cache) a URL de uma thumbnail para o asset. Para imagens, a
 * própria fonte; para vídeos, um frame renderizado; áudio não tem thumbnail.
 */
export function getAssetThumbnail(asset: Asset): Promise<string | null> {
  if (asset.type === "image") return Promise.resolve(asset.source);
  if (asset.type !== "video") return Promise.resolve(null);
  if (typeof document === "undefined") return Promise.resolve(null);

  const cached = cache.get(asset.id);
  if (cached) return cached;

  const promise = generateVideoThumbnail(asset.source).catch(() => "");
  cache.set(asset.id, promise);
  return promise.then((url) => url || null);
}

/** Limpa o cache de uma thumbnail (ao remover o asset). */
export function clearAssetThumbnail(assetId: string): void {
  cache.delete(assetId);
}
