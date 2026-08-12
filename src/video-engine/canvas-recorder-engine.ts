/**
 * CanvasRecorderEngine — exportação client-side via Canvas + MediaRecorder.
 *
 * Compõe, em tempo real, o clip de vídeo primário + as camadas de texto em um
 * canvas do tamanho do RenderPlan e grava o resultado em WebM. É a primeira
 * implementação real do Video Engine (não usa FFmpeg).
 *
 * Escopo atual (coerente com o preview): um clip de vídeo + textos + o áudio
 * do próprio vídeo. Composição multi-clip completa e MP4/H.264 ficam para a
 * implementação FFmpeg (ver docs/ROADMAP.md).
 *
 * Browser-only: usa document/HTMLVideoElement/MediaRecorder.
 */

import type { RenderPlan, RenderTextLayer } from "@/types";
import type {
  ExportOptions,
  ExportResult,
  VideoEngine,
} from "./types";

function pickMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  if (typeof MediaRecorder === "undefined") return "video/webm";
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? "video/webm";
}

function drawText(
  ctx: CanvasRenderingContext2D,
  layer: RenderTextLayer,
  width: number,
  height: number,
) {
  const x = layer.position.x * width;
  const y = layer.position.y * height;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.globalAlpha = layer.opacity;
  ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
  ctx.textAlign =
    layer.align === "left" ? "left" : layer.align === "right" ? "right" : "center";
  ctx.textBaseline = "middle";
  if (layer.backgroundColor && layer.backgroundColor !== "transparent") {
    const metrics = ctx.measureText(layer.text);
    const pad = layer.fontSize * 0.2;
    const w = metrics.width + pad * 2;
    const h = layer.fontSize + pad * 2;
    const bx = layer.align === "left" ? 0 : layer.align === "right" ? -w : -w / 2;
    ctx.fillStyle = layer.backgroundColor;
    ctx.fillRect(bx, -h / 2, w, h);
  }
  ctx.fillStyle = layer.color;
  ctx.fillText(layer.text, 0, 0);
  ctx.restore();
}

export class CanvasRecorderEngine implements VideoEngine {
  export(plan: RenderPlan, options: ExportOptions = {}): Promise<ExportResult> {
    const { onProgress, signal } = options;

    return new Promise<ExportResult>((resolve, reject) => {
      if (typeof document === "undefined" || typeof MediaRecorder === "undefined") {
        reject(new Error("Exportação não suportada neste ambiente."));
        return;
      }

      const primary = plan.videoLayers[0];
      if (!primary) {
        reject(new Error("Nenhum vídeo para exportar."));
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = plan.width;
      canvas.height = plan.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Não foi possível preparar o canvas de exportação."));
        return;
      }

      const video = document.createElement("video");
      video.src = primary.assetSource;
      video.muted = false;
      video.playsInline = true;
      video.crossOrigin = "anonymous";

      let raf = 0;
      let recorder: MediaRecorder | null = null;
      const chunks: BlobPart[] = [];
      let settled = false;

      const cleanup = () => {
        if (raf) cancelAnimationFrame(raf);
        video.pause();
        video.removeAttribute("src");
        video.load();
      };

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      };

      const onAbort = () => fail(new Error("Exportação cancelada."));
      if (signal) {
        if (signal.aborted) return onAbort();
        signal.addEventListener("abort", onAbort, { once: true });
      }

      const drawFrame = () => {
        const t = video.currentTime;
        ctx.fillStyle = plan.backgroundColor || "#000";
        ctx.fillRect(0, 0, plan.width, plan.height);

        // Vídeo com "contain" no canvas.
        const vw = video.videoWidth || plan.width;
        const vh = video.videoHeight || plan.height;
        const scale = Math.min(plan.width / vw, plan.height / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        ctx.drawImage(video, (plan.width - dw) / 2, (plan.height - dh) / 2, dw, dh);

        // Textos ativos no instante atual.
        for (const layer of plan.textLayers) {
          if (t >= layer.timelineStart && t < layer.timelineStart + layer.duration) {
            drawText(ctx, layer, plan.width, plan.height);
          }
        }

        const progress = plan.duration > 0 ? Math.min(t / plan.duration, 1) : 0;
        onProgress?.({ phase: "exporting", progress });

        if (!video.paused && !video.ended && video.currentTime < primary.sourceEnd) {
          raf = requestAnimationFrame(drawFrame);
        }
      };

      video.onloadedmetadata = () => {
        video.currentTime = primary.sourceStart;
      };

      video.onerror = () => fail(new Error("Não foi possível abrir este vídeo."));

      video.oncanplay = () => {
        if (settled || recorder) return;
        try {
          onProgress?.({ phase: "processing", message: "Processando…", progress: 0 });

          const fps = plan.fps || 30;
          const canvasStream = canvas.captureStream(fps);

          // Anexa a trilha de áudio do vídeo, se houver.
          const vStream = (video as HTMLVideoElement & {
            captureStream?: () => MediaStream;
          }).captureStream?.();
          vStream?.getAudioTracks().forEach((track) => canvasStream.addTrack(track));

          const mimeType = pickMimeType();
          recorder = new MediaRecorder(canvasStream, { mimeType });
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };
          recorder.onstop = () => {
            if (settled) return;
            settled = true;
            cleanup();
            const blob = new Blob(chunks, { type: mimeType });
            resolve({
              url: URL.createObjectURL(blob),
              mimeType,
              sizeBytes: blob.size,
            });
          };

          recorder.start();
          void video.play();
          raf = requestAnimationFrame(drawFrame);

          const stop = () => {
            if (recorder && recorder.state !== "inactive") recorder.stop();
          };
          video.onended = stop;
          video.ontimeupdate = () => {
            if (video.currentTime >= primary.sourceEnd) stop();
          };
        } catch (err) {
          fail(err instanceof Error ? err : new Error("Falha ao iniciar a gravação."));
        }
      };
    });
  }
}
