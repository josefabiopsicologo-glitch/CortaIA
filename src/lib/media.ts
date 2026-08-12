/**
 * Leitura de metadata de mídia no browser (duração/dimensões).
 *
 * Depende de APIs do navegador (HTMLMediaElement / Image), portanto só deve
 * rodar no cliente. Gerencia Object URLs com cuidado para não vazar memória
 * (ver seção Performance em docs/ARCHITECTURE.md).
 */

import type { Asset, AssetType } from "@/types";
import { createId } from "./id";
import { detectAssetType } from "./validation";

export interface MediaMetadata {
  duration: number;
  width?: number;
  height?: number;
}

function readVideoMetadata(url: string): Promise<MediaMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };
    video.onerror = () =>
      reject(
        new Error(
          "Não foi possível abrir este vídeo — o codec pode não ser suportado por este navegador (ex.: H.264/HEVC).",
        ),
      );
    video.src = url;
  });
}

function readAudioMetadata(url: string): Promise<MediaMetadata> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => resolve({ duration: audio.duration });
    audio.onerror = () =>
      reject(
        new Error(
          "Não foi possível abrir este áudio — o codec pode não ser suportado por este navegador.",
        ),
      );
    audio.src = url;
  });
}

function readImageMetadata(url: string): Promise<MediaMetadata> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ duration: 0, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Não foi possível abrir esta imagem."));
    img.src = url;
  });
}

function readMetadata(type: AssetType, url: string): Promise<MediaMetadata> {
  if (type === "video") return readVideoMetadata(url);
  if (type === "audio") return readAudioMetadata(url);
  return readImageMetadata(url);
}

/**
 * Cria um Asset a partir de um File, lendo metadata real.
 * O `source` é um Object URL — lembre de revogar (revokeAssetSource) ao remover.
 */
export async function createAssetFromFile(file: File): Promise<Asset> {
  const type = detectAssetType(file.type);
  if (!type) throw new Error("Formato não suportado.");

  const url = URL.createObjectURL(file);
  try {
    const meta = await readMetadata(type, url);
    return {
      id: createId("asset"),
      type,
      name: file.name,
      source: url,
      duration: meta.duration || 0,
      width: meta.width,
      height: meta.height,
      mimeType: file.type,
      fileSize: file.size,
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

export function revokeAssetSource(asset: Pick<Asset, "source">): void {
  if (asset.source.startsWith("blob:")) {
    URL.revokeObjectURL(asset.source);
  }
}
