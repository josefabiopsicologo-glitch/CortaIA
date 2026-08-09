/**
 * Project — o estado persistente completo de uma edição.
 *
 * Assets e Clips ficam normalizados (Record por id) para facilitar
 * operações e o histórico de Undo/Redo. As Tracks são ordenadas
 * (topo -> base na UI) e referenciam clips por id.
 */

import type { Asset } from "./asset";
import type { Canvas } from "./canvas";
import type { Clip } from "./clip";
import type { Track } from "./track";

export interface ProjectSettings {
  /** Frames por segundo alvo da exportação. */
  fps: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  canvas: Canvas;
  tracks: Track[];
  assets: Record<string, Asset>;
  clips: Record<string, Clip>;
  settings: ProjectSettings;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  fps: 30,
};
