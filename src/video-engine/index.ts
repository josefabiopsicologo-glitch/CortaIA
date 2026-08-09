/**
 * Video Engine — ponto de entrada.
 *
 * Ainda NÃO implementado (FASE 11). Este módulo estabelece a fronteira de
 * arquitetura: exportação passa por aqui, nunca por comandos FFmpeg espalhados
 * pela UI. Ver docs/ARCHITECTURE.md.
 */

import type { RenderPlan } from "@/types";
import type { ExportOptions, ExportResult, VideoEngine } from "./types";

export * from "./types";
export * from "./render-plan";

class NotImplementedVideoEngine implements VideoEngine {
  async export(_plan: RenderPlan, _options?: ExportOptions): Promise<ExportResult> {
    void _plan;
    void _options;
    throw new Error(
      "Video Engine ainda não implementado (FASE 11 — exportação).",
    );
  }
}

/** Instância atual do engine. Será substituída pela implementação FFmpeg. */
export const videoEngine: VideoEngine = new NotImplementedVideoEngine();
