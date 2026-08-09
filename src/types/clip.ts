/**
 * Clip — a utilização de uma mídia (ou de um texto) na timeline.
 *
 * Edição não destrutiva: um Clip descreve QUANDO e COMO um trecho aparece,
 * mas nunca modifica o Asset original. A renderização real só acontece na
 * exportação, a partir do estado dos Clips.
 *
 * Modelamos Clip como união discriminada por `type`:
 *   - MediaClip: video | audio | image (referencia um Asset)
 *   - TextClip: texto sobreposto (não referencia Asset)
 */

export type ClipType = "video" | "audio" | "image" | "text";

export interface Vec2 {
  x: number;
  y: number;
}

/** Campos comuns a todos os tipos de clip. */
export interface BaseClip {
  id: string;
  trackId: string;
  type: ClipType;
  /** Início na timeline, em segundos. */
  timelineStart: number;
  /** Duração ocupada na timeline, em segundos. */
  duration: number;
  /** Clip habilitado (visível/audível). */
  enabled: boolean;
}

/** Clip de mídia (video/audio/image) que referencia um Asset. */
export interface MediaClip extends BaseClip {
  type: "video" | "audio" | "image";
  assetId: string;
  /**
   * Trecho do Asset utilizado (in/out), em segundos no tempo da mídia.
   * Invariante (velocidade 1x): duration === sourceEnd - sourceStart.
   * Para imagens, sourceStart/sourceEnd são 0 e a duração é livre.
   */
  sourceStart: number;
  sourceEnd: number;

  /** Transformações visuais (ignoradas para áudio). */
  position: Vec2;
  scale: number;
  rotation: number;
  opacity: number;

  /** Volume de 0 a 1 (ignorado para imagem). */
  volume: number;
}

export type TextAlign = "left" | "center" | "right";

/** Clip de texto sobreposto ao canvas. */
export interface TextClip extends BaseClip {
  type: "text";
  text: string;

  /** Posição relativa ao canvas (0..1), independente da resolução. */
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

export type Clip = MediaClip | TextClip;

export function isMediaClip(clip: Clip): clip is MediaClip {
  return clip.type !== "text";
}

export function isTextClip(clip: Clip): clip is TextClip {
  return clip.type === "text";
}
