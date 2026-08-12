/**
 * ExportService — orquestra a exportação de um Project.
 *
 * Fluxo: Project → validação → RenderPlan → Video Engine → arquivo final.
 * Mantém a lógica de estados/validação separada da UI e do engine concreto,
 * o que a torna testável com um engine fake.
 */

import type { Project } from "@/types";
import { buildRenderPlan } from "@/video-engine/render-plan";
import type {
  ExportProgress,
  ExportResult,
  VideoEngine,
} from "@/video-engine/types";

export interface ExportRunOptions {
  onProgress?: (p: ExportProgress) => void;
  signal?: AbortSignal;
}

/**
 * Retorna uma mensagem amigável se o projeto NÃO puder ser exportado, ou null
 * se estiver apto. Regras conservadoras para não gerar arquivos vazios.
 */
export function getExportBlocker(project: Project): string | null {
  const plan = buildRenderPlan(project);
  if (plan.duration <= 0) {
    return "Adicione ao menos um clip à timeline antes de exportar.";
  }
  if (plan.videoLayers.length === 0) {
    return "Importe um vídeo para exportar (por enquanto a exportação precisa de vídeo).";
  }
  return null;
}

/**
 * Executa a exportação. Lança um Error com mensagem amigável em caso de falha
 * ou cancelamento.
 */
export async function exportProject(
  project: Project,
  engine: VideoEngine,
  { onProgress, signal }: ExportRunOptions = {},
): Promise<ExportResult> {
  const emit = (p: ExportProgress) => onProgress?.(p);

  if (signal?.aborted) throw new Error("Exportação cancelada.");

  emit({ phase: "preparing", message: "Preparando…" });

  const blocker = getExportBlocker(project);
  if (blocker) {
    emit({ phase: "error", message: blocker });
    throw new Error(blocker);
  }

  const plan = buildRenderPlan(project);

  try {
    const result = await engine.export(plan, { onProgress, signal });
    emit({ phase: "done", progress: 1, message: "Concluído." });
    return result;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha durante a exportação.";
    emit({ phase: "error", message });
    throw err instanceof Error ? err : new Error(message);
  }
}
