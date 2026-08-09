/**
 * Track — uma faixa da timeline que agrupa clips do mesmo tipo.
 *
 * Os Clips são armazenados de forma normalizada no Project (Record por id);
 * a Track guarda apenas a ordem dos ids que pertencem a ela (`clipIds`).
 * Isso simplifica seleção, split, trim, undo/redo e move entre faixas.
 */

export type TrackType = "video" | "text" | "audio";

export interface Track {
  id: string;
  type: TrackType;
  name: string;
  clipIds: string[];
  locked: boolean;
  hidden: boolean;
  muted: boolean;
}
