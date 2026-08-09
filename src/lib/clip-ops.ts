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
