/**
 * Fábricas para criar entidades do editor com valores padrão coerentes.
 */

import type {
  Asset,
  AspectRatio,
  MediaClip,
  Project,
  TextClip,
  Track,
} from "@/types";
import {
  canvasFromPreset,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_PROJECT_SETTINGS,
} from "@/types";
import { createId } from "./id";

/** Ids fixos das faixas padrão (facilita testes e referências). */
export const DEFAULT_TRACK_IDS = {
  text: "track_text",
  video: "track_video",
  audio: "track_audio",
} as const;

/**
 * Cria as faixas padrão na ordem de exibição (topo -> base):
 * TEXT sobre VIDEO sobre AUDIO.
 */
export function createDefaultTracks(): Track[] {
  return [
    {
      id: DEFAULT_TRACK_IDS.text,
      type: "text",
      name: "Texto",
      clipIds: [],
      locked: false,
      hidden: false,
      muted: false,
    },
    {
      id: DEFAULT_TRACK_IDS.video,
      type: "video",
      name: "Vídeo",
      clipIds: [],
      locked: false,
      hidden: false,
      muted: false,
    },
    {
      id: DEFAULT_TRACK_IDS.audio,
      type: "audio",
      name: "Áudio",
      clipIds: [],
      locked: false,
      hidden: false,
      muted: false,
    },
  ];
}

export function createEmptyProject(
  name = "Projeto sem título",
  aspectRatio: AspectRatio = DEFAULT_ASPECT_RATIO,
): Project {
  const now = Date.now();
  return {
    id: createId("proj"),
    name,
    createdAt: now,
    updatedAt: now,
    canvas: canvasFromPreset(aspectRatio),
    tracks: createDefaultTracks(),
    assets: {},
    clips: {},
    settings: { ...DEFAULT_PROJECT_SETTINGS },
  };
}

/** Cria um MediaClip cobrindo todo o asset, iniciando em `timelineStart`. */
export function createMediaClipFromAsset(
  asset: Asset,
  trackId: string,
  timelineStart = 0,
): MediaClip {
  const isImage = asset.type === "image";
  const duration = isImage ? 5 : asset.duration;
  return {
    id: createId("clip"),
    trackId,
    type: asset.type,
    assetId: asset.id,
    timelineStart,
    duration,
    enabled: true,
    sourceStart: 0,
    sourceEnd: isImage ? 0 : asset.duration,
    position: { x: 0, y: 0 },
    scale: 1,
    rotation: 0,
    opacity: 1,
    volume: asset.type === "audio" || asset.type === "video" ? 1 : 0,
  };
}

export function createTextClip(
  trackId: string,
  overrides: Partial<TextClip> = {},
): TextClip {
  return {
    id: createId("clip"),
    trackId,
    type: "text",
    text: "Novo texto",
    timelineStart: 0,
    duration: 3,
    enabled: true,
    position: { x: 0.5, y: 0.5 },
    fontFamily: "system-ui, sans-serif",
    fontSize: 64,
    fontWeight: 700,
    color: "#FFFFFF",
    backgroundColor: "transparent",
    align: "center",
    opacity: 1,
    rotation: 0,
    ...overrides,
  };
}
