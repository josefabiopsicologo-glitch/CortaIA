// Detecção de silêncio via Web Audio API (roda no navegador).
// Usada pelo recurso de "Cortes automáticos": remove trechos silenciosos
// e mantém apenas os momentos com fala/áudio.

import type { Clip, SilenceRegion } from './types';
import { uid } from './format';

export interface SilenceOptions {
  /** limiar de volume (0-1, RMS). Abaixo disso é considerado silêncio. */
  threshold: number;
  /** duração mínima (s) de um trecho silencioso para ser cortado */
  minSilence: number;
  /** margem (s) mantida ao redor da fala para não cortar abruptamente */
  padding: number;
}

export const DEFAULT_SILENCE: SilenceOptions = {
  threshold: 0.02,
  minSilence: 0.6,
  padding: 0.15,
};

/**
 * Decodifica o áudio do arquivo e retorna as regiões silenciosas detectadas.
 */
export async function detectSilence(
  file: Blob,
  opts: SilenceOptions = DEFAULT_SILENCE
): Promise<{ regions: SilenceRegion[]; duration: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    // fecha o contexto para liberar recursos; ignore erros de navegadores antigos
    ctx.close().catch(() => {});
  }

  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;

  // Janela de análise de ~20ms.
  const windowSize = Math.max(1, Math.floor(sampleRate * 0.02));
  const regions: SilenceRegion[] = [];

  let silenceStart: number | null = null;
  for (let i = 0; i < data.length; i += windowSize) {
    let sumSq = 0;
    const end = Math.min(i + windowSize, data.length);
    for (let j = i; j < end; j++) sumSq += data[j] * data[j];
    const rms = Math.sqrt(sumSq / (end - i));
    const t = i / sampleRate;

    if (rms < opts.threshold) {
      if (silenceStart === null) silenceStart = t;
    } else if (silenceStart !== null) {
      pushRegion(regions, silenceStart, t, opts.minSilence);
      silenceStart = null;
    }
  }
  if (silenceStart !== null) pushRegion(regions, silenceStart, duration, opts.minSilence);

  return { regions, duration };
}

function pushRegion(regions: SilenceRegion[], start: number, end: number, minSilence: number) {
  if (end - start >= minSilence) regions.push({ start, end });
}

/**
 * Converte regiões silenciosas em clipes (os trechos NÃO silenciosos), com margem.
 */
export function silenceToClips(
  regions: SilenceRegion[],
  duration: number,
  padding: number
): Clip[] {
  const clips: Clip[] = [];
  let cursor = 0;
  for (const r of regions) {
    const speechEnd = Math.max(cursor, r.start - 0 + padding);
    if (speechEnd - cursor > 0.05) {
      clips.push({ id: uid('clip'), start: cursor, end: Math.min(duration, speechEnd) });
    }
    cursor = Math.max(cursor, r.end - padding);
  }
  if (duration - cursor > 0.05) {
    clips.push({ id: uid('clip'), start: cursor, end: duration });
  }
  return clips.length ? clips : [{ id: uid('clip'), start: 0, end: duration }];
}
