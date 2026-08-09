/**
 * RenderPlan — representação intermediária, independente de UI e de FFmpeg,
 * usada como contrato entre o estado do Project e o Video Engine.
 *
 * Fluxo: Project state -> normalização -> RenderPlan -> Video Engine -> FFmpeg.
 *
 * Ainda NÃO é executado no MVP inicial; o tipo existe para manter a
 * arquitetura de exportação preparada (ver docs/ARCHITECTURE.md).
 */

import type { AspectRatio } from "./canvas";
import type { TextAlign, Vec2 } from "./clip";

export interface RenderVideoLayer {
  clipId: string;
  assetSource: string;
  timelineStart: number;
  duration: number;
  sourceStart: number;
  sourceEnd: number;
  position: Vec2;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface RenderAudioLayer {
  clipId: string;
  assetSource: string;
  timelineStart: number;
  duration: number;
  sourceStart: number;
  sourceEnd: number;
  volume: number;
}

export interface RenderTextLayer {
  clipId: string;
  text: string;
  timelineStart: number;
  duration: number;
  position: Vec2;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  backgroundColor: string;
  align: TextAlign;
  opacity: number;
  rotation: number;
}

export interface RenderPlan {
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  duration: number;
  fps: number;
  backgroundColor: string;
  videoLayers: RenderVideoLayer[];
  audioLayers: RenderAudioLayer[];
  textLayers: RenderTextLayer[];
}
