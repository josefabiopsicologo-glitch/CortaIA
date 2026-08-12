/**
 * Video Engine — ponto de entrada.
 *
 * Ainda NÃO implementado (FASE 11). Este módulo estabelece a fronteira de
 * arquitetura: exportação passa por aqui, nunca por comandos FFmpeg espalhados
 * pela UI. Ver docs/ARCHITECTURE.md.
 */

import type { RenderPlan } from "@/types";
import type { ExportOptions, ExportResult, VideoEngine } from "./types";
import { CanvasRecorderEngine } from "./canvas-recorder-engine";

export * from "./types";
export * from "./render-plan";
export { CanvasRecorderEngine } from "./canvas-recorder-engine";

class NotSupportedVideoEngine implements VideoEngine {
  async export(_plan: RenderPlan, _options?: ExportOptions): Promise<ExportResult> {
    void _plan;
    void _options;
    throw new Error("Exportação não suportada neste ambiente.");
  }
}

/**
 * Seleciona o engine disponível. Hoje: CanvasRecorderEngine (WebM) no browser.
 * Futuro: engine FFmpeg (MP4/H.264) com composição multi-clip.
 */
export function createVideoEngine(): VideoEngine {
  if (typeof window !== "undefined" && typeof MediaRecorder !== "undefined") {
    return new CanvasRecorderEngine();
  }
  return new NotSupportedVideoEngine();
}
