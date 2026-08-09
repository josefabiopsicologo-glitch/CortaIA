/**
 * Contratos do Video Engine.
 *
 * O Video Engine é a ÚNICA fronteira do app com FFmpeg. Componentes React e a
 * futura IA não montam comandos: eles descrevem intenções (RenderPlan / ações
 * estruturadas) e o engine decide como executá-las.
 */

import type { RenderPlan } from "@/types";

export type ExportPhase =
  | "idle"
  | "preparing"
  | "processing"
  | "exporting"
  | "done"
  | "error";

export interface ExportProgress {
  phase: ExportPhase;
  /** 0..1 quando conhecido; undefined enquanto indeterminado. */
  progress?: number;
  message?: string;
}

export interface ExportResult {
  /** URL do arquivo final (ex.: Object URL de um Blob MP4). */
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ExportOptions {
  onProgress?: (p: ExportProgress) => void;
  signal?: AbortSignal;
}

export interface VideoEngine {
  /** Renderiza um RenderPlan em um arquivo final (planejado: FFmpeg). */
  export(plan: RenderPlan, options?: ExportOptions): Promise<ExportResult>;
}
