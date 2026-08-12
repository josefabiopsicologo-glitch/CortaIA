/**
 * Operações puras sobre Clips (não destrutivas, sem efeitos colaterais).
 *
 * São a base testável usada pelo editor-store. Nenhuma dessas funções
 * gera ou modifica arquivos: apenas transformam o estado dos clips.
 */

import type { Clip } from "@/types";
import { isMediaClip } from "@/types";
import { clamp } from "./time";

/** Fim de um clip na timeline (segundos). */
export function clipTimelineEnd(clip: Clip): number {
  return clip.timelineStart + clip.duration;
}

/** True se o instante absoluto `atTime` cai dentro do clip. */
export function timeIsInsideClip(clip: Clip, atTime: number): boolean {
  return atTime > clip.timelineStart && atTime < clipTimelineEnd(clip);
}

export interface SplitResult {
  left: Clip;
  right: Clip;
}

/**
 * Divide um clip em dois no instante absoluto `atTime` da timeline.
 *
 * Operação puramente lógica: NÃO renderiza dois arquivos. Para clips de
 * mídia, ajusta sourceStart/sourceEnd proporcionalmente (velocidade 1x).
 *
 * Retorna null se `atTime` não estiver estritamente dentro do clip.
 * `newId` é o id atribuído à parte direita (a esquerda mantém o id original).
 */
export function splitClip(
  clip: Clip,
  atTime: number,
  newId: string,
): SplitResult | null {
  if (!timeIsInsideClip(clip, atTime)) return null;

  const localOffset = atTime - clip.timelineStart;
  const rightDuration = clip.duration - localOffset;

  if (isMediaClip(clip)) {
    const splitSource = clip.sourceStart + localOffset;
    const left: Clip = {
      ...clip,
      duration: localOffset,
      sourceEnd: splitSource,
    };
    const right: Clip = {
      ...clip,
      id: newId,
      timelineStart: atTime,
      duration: rightDuration,
      sourceStart: splitSource,
    };
    return { left, right };
  }

  // TextClip: sem fonte de mídia, apenas divide a duração.
  const left: Clip = { ...clip, duration: localOffset };
  const right: Clip = {
    ...clip,
    id: newId,
    timelineStart: atTime,
    duration: rightDuration,
  };
  return { left, right };
}

export interface TrimInput {
  /** Novo in-point no tempo da mídia (segundos). */
  sourceStart?: number;
  /** Novo out-point no tempo da mídia (segundos). */
  sourceEnd?: number;
}

/**
 * Apara (trim) um clip de mídia ajustando in/out.
 *
 * - Alterar sourceStart move também o timelineStart pelo mesmo delta
 *   (a borda direita na timeline permanece fixa).
 * - Alterar sourceEnd mantém o timelineStart (a borda esquerda fixa).
 *
 * `assetDuration` limita o out-point. Garante duração mínima > 0.
 * Retorna o clip inalterado se a operação for inválida.
 */
export function trimMediaClip<T extends Clip>(
  clip: T,
  { sourceStart, sourceEnd }: TrimInput,
  assetDuration: number,
  minDuration = 0.05,
): T {
  if (!isMediaClip(clip)) return clip;

  let nextStart = sourceStart ?? clip.sourceStart;
  let nextEnd = sourceEnd ?? clip.sourceEnd;

  nextStart = clamp(nextStart, 0, assetDuration - minDuration);
  nextEnd = clamp(nextEnd, minDuration, assetDuration);

  if (nextEnd - nextStart < minDuration) return clip;

  const startDelta = nextStart - clip.sourceStart;
  const newTimelineStart =
    sourceStart !== undefined
      ? Math.max(0, clip.timelineStart + startDelta)
      : clip.timelineStart;

  return {
    ...clip,
    sourceStart: nextStart,
    sourceEnd: nextEnd,
    duration: nextEnd - nextStart,
    timelineStart: newTimelineStart,
  };
}

/** Move um clip para um novo início na timeline (nunca negativo). */
export function moveClipTo<T extends Clip>(clip: T, newTimelineStart: number): T {
  return { ...clip, timelineStart: Math.max(0, newTimelineStart) };
}

export interface ResizeInput {
  /** Deslocamento da borda esquerda, em segundos (>0 encolhe pela esquerda). */
  startDelta?: number;
  /** Deslocamento da borda direita, em segundos (>0 estende à direita). */
  endDelta?: number;
}

/**
 * Redimensiona um TextClip pelas bordas (sem noção de fonte de mídia).
 * A borda esquerda move `timelineStart` e ajusta a duração; a direita ajusta
 * apenas a duração. Respeita duração mínima e início não-negativo.
 */
export function resizeTextClip<T extends Clip>(
  clip: T,
  { startDelta = 0, endDelta = 0 }: ResizeInput,
  minDuration = 0.1,
): T {
  let { timelineStart, duration } = clip;

  if (startDelta !== 0) {
    // Limita para não passar do início do projeto nem abaixo da duração mínima.
    const maxDelta = duration - minDuration;
    const minDelta = -timelineStart;
    const d = clamp(startDelta, minDelta, maxDelta);
    timelineStart += d;
    duration -= d;
  }

  if (endDelta !== 0) {
    duration = Math.max(minDuration, duration + endDelta);
  }

  return { ...clip, timelineStart, duration };
}

/**
 * Ajusta um instante ao alvo mais próximo dentro de `threshold` (segundos).
 * Usado para "snap" da timeline ao playhead e às bordas de outros clips.
 */
export function snapTime(
  time: number,
  targets: number[],
  threshold: number,
): number {
  let best = time;
  let bestDist = threshold;
  for (const t of targets) {
    const dist = Math.abs(t - time);
    if (dist <= bestDist) {
      best = t;
      bestDist = dist;
    }
  }
  return best;
}
