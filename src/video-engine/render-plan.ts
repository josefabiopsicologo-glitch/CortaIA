/**
 * Normalização: Project state -> RenderPlan.
 *
 * Função pura (sem FFmpeg, sem DOM). Converte o estado editável em uma
 * representação plana e ordenada, pronta para o motor de exportação.
 */

import type { Project, RenderPlan, RenderAudioLayer, RenderTextLayer, RenderVideoLayer } from "@/types";
import { isTextClip } from "@/types";

export function buildRenderPlan(project: Project): RenderPlan {
  const videoLayers: RenderVideoLayer[] = [];
  const audioLayers: RenderAudioLayer[] = [];
  const textLayers: RenderTextLayer[] = [];
  let duration = 0;

  for (const clip of Object.values(project.clips)) {
    if (!clip.enabled) continue;
    duration = Math.max(duration, clip.timelineStart + clip.duration);

    if (isTextClip(clip)) {
      textLayers.push({
        clipId: clip.id,
        text: clip.text,
        timelineStart: clip.timelineStart,
        duration: clip.duration,
        position: clip.position,
        fontFamily: clip.fontFamily,
        fontSize: clip.fontSize,
        fontWeight: clip.fontWeight,
        color: clip.color,
        backgroundColor: clip.backgroundColor,
        align: clip.align,
        opacity: clip.opacity,
        rotation: clip.rotation,
      });
      continue;
    }

    const asset = project.assets[clip.assetId];
    if (!asset) continue;

    if (clip.type === "audio") {
      audioLayers.push({
        clipId: clip.id,
        assetSource: asset.source,
        timelineStart: clip.timelineStart,
        duration: clip.duration,
        sourceStart: clip.sourceStart,
        sourceEnd: clip.sourceEnd,
        volume: clip.volume,
      });
    } else {
      // video ou image
      videoLayers.push({
        clipId: clip.id,
        assetSource: asset.source,
        timelineStart: clip.timelineStart,
        duration: clip.duration,
        sourceStart: clip.sourceStart,
        sourceEnd: clip.sourceEnd,
        position: clip.position,
        scale: clip.scale,
        rotation: clip.rotation,
        opacity: clip.opacity,
      });
    }
  }

  // Ordena por início na timeline (determinismo para a exportação).
  const byStart = (a: { timelineStart: number }, b: { timelineStart: number }) =>
    a.timelineStart - b.timelineStart;
  videoLayers.sort(byStart);
  audioLayers.sort(byStart);
  textLayers.sort(byStart);

  return {
    width: project.canvas.width,
    height: project.canvas.height,
    aspectRatio: project.canvas.aspectRatio,
    duration,
    fps: project.settings.fps,
    backgroundColor: project.canvas.backgroundColor,
    videoLayers,
    audioLayers,
    textLayers,
  };
}
