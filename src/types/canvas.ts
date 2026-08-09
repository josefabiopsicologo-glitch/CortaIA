/**
 * Canvas — a área de composição/renderização do projeto.
 *
 * O aspecto (aspectRatio) é a fonte da verdade para o formato de saída.
 * width/height são derivados de um preset, mas ficam materializados aqui
 * para que o RenderPlan e o VideoEngine não precisem recalcular.
 */

export type AspectRatio = "9:16" | "1:1" | "16:9";

export interface Canvas {
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  backgroundColor: string;
}

export interface CanvasPreset {
  id: AspectRatio;
  label: string;
  /** Plataformas típicas para este formato (apenas informativo na UI). */
  platforms: string[];
  width: number;
  height: number;
}

/**
 * Presets de formato suportados no MVP.
 * REELS/SHORTS/TIKTOK (9:16), INSTAGRAM (1:1), YOUTUBE (16:9).
 */
export const CANVAS_PRESETS: Record<AspectRatio, CanvasPreset> = {
  "9:16": {
    id: "9:16",
    label: "Reels / Shorts / TikTok",
    platforms: ["Instagram Reels", "YouTube Shorts", "TikTok"],
    width: 1080,
    height: 1920,
  },
  "1:1": {
    id: "1:1",
    label: "Instagram (quadrado)",
    platforms: ["Instagram"],
    width: 1080,
    height: 1080,
  },
  "16:9": {
    id: "16:9",
    label: "YouTube (horizontal)",
    platforms: ["YouTube"],
    width: 1920,
    height: 1080,
  },
};

export const DEFAULT_ASPECT_RATIO: AspectRatio = "9:16";
export const DEFAULT_CANVAS_BACKGROUND = "#000000";

export function canvasFromPreset(
  aspectRatio: AspectRatio,
  backgroundColor: string = DEFAULT_CANVAS_BACKGROUND,
): Canvas {
  const preset = CANVAS_PRESETS[aspectRatio];
  return {
    width: preset.width,
    height: preset.height,
    aspectRatio,
    backgroundColor,
  };
}
