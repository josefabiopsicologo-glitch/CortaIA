// Modelo de dados do editor CortaIA.
// Todos os tempos são em segundos, referentes ao vídeo de origem (source time).

export interface Clip {
  id: string;
  /** início no vídeo de origem (segundos) */
  start: number;
  /** fim no vídeo de origem (segundos) */
  end: number;
}

export interface Subtitle {
  id: string;
  /** início no vídeo de origem (segundos) */
  start: number;
  /** fim no vídeo de origem (segundos) */
  end: number;
  text: string;
}

export interface SilenceRegion {
  start: number;
  end: number;
}

export interface EditorProject {
  /** nome do arquivo importado */
  fileName: string;
  /** duração total do vídeo de origem (segundos) */
  duration: number;
  clips: Clip[];
  subtitles: Subtitle[];
}

export const clipDuration = (c: Clip): number => Math.max(0, c.end - c.start);

/** Duração total da timeline (soma dos clipes). */
export const timelineDuration = (clips: Clip[]): number =>
  clips.reduce((acc, c) => acc + clipDuration(c), 0);
