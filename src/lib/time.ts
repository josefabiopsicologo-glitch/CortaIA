/**
 * Conversões e formatação de tempo da timeline.
 *
 * Centraliza a relação tempo <-> pixels (pixelsPerSecond) para que nenhum
 * componente reimplemente esses cálculos. Ver testes em time.test.ts.
 */

/** Restringe um valor ao intervalo [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) return min;
  return Math.min(Math.max(value, min), max);
}

/** Converte um instante (segundos) para posição horizontal (pixels). */
export function timeToPixels(seconds: number, pixelsPerSecond: number): number {
  return seconds * pixelsPerSecond;
}

/** Converte uma posição horizontal (pixels) para um instante (segundos). */
export function pixelsToTime(pixels: number, pixelsPerSecond: number): number {
  if (pixelsPerSecond <= 0) return 0;
  return pixels / pixelsPerSecond;
}

/**
 * Formata segundos como timecode "MM:SS" ou "M:SS.d" (com décimos).
 * Ex.: 65 -> "01:05"; 65.4 (withTenths) -> "01:05.4".
 */
export function formatTimecode(seconds: number, withTenths = false): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const totalSeconds = Math.floor(safe);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const base = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  if (!withTenths) return base;
  const tenths = Math.floor((safe - totalSeconds) * 10);
  return `${base}.${tenths}`;
}
