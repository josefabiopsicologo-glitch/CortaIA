// Exportação do vídeo final: corta cada clipe, concatena e (opcionalmente)
// queima as legendas. Roda inteiramente no navegador via ffmpeg.wasm.

import { fetchFile } from '@ffmpeg/util';
import { getFFmpeg } from './ffmpeg';
import type { Clip, Subtitle } from './types';
import { clipDuration } from './types';
import { subtitlesToSrt } from './subtitles';

export interface ExportOptions {
  clips: Clip[];
  subtitles: Subtitle[];
  burnSubtitles: boolean;
  /** callback de progresso 0..1 */
  onProgress?: (ratio: number, stage: string) => void;
  onLog?: (msg: string) => void;
}

export interface ExportResult {
  videoUrl: string;
  /** presente quando as legendas não puderam ser queimadas no vídeo */
  srtUrl?: string;
  warning?: string;
}

/**
 * Recorta as legendas para a timeline final e reescala os tempos, já que a
 * concatenação remove os trechos cortados (o tempo "muda" após os cortes).
 */
function remapSubtitles(subs: Subtitle[], clips: Clip[]): Subtitle[] {
  const out: Subtitle[] = [];
  let offset = 0; // posição na timeline final
  for (const clip of clips) {
    for (const s of subs) {
      const start = Math.max(s.start, clip.start);
      const end = Math.min(s.end, clip.end);
      if (end - start > 0.05) {
        out.push({
          id: s.id + '_' + clip.id,
          start: offset + (start - clip.start),
          end: offset + (end - clip.start),
          text: s.text,
        });
      }
    }
    offset += clipDuration(clip);
  }
  return out;
}

export async function exportVideo(file: Blob, opts: ExportOptions): Promise<ExportResult> {
  const { clips, subtitles, burnSubtitles, onProgress, onLog } = opts;
  if (!clips.length) throw new Error('Nenhum clipe na timeline para exportar.');

  const ffmpeg = await getFFmpeg(onLog);

  onProgress?.(0.02, 'Preparando');
  await ffmpeg.writeFile('input.mp4', await fetchFile(file));

  // 1) Corta cada clipe re-encodando para um formato uniforme (permite concat).
  const partNames: string[] = [];
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    const name = `part${i}.mp4`;
    await ffmpeg.exec([
      '-ss', c.start.toFixed(3),
      '-i', 'input.mp4',
      '-t', clipDuration(c).toFixed(3),
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-c:a', 'aac',
      '-avoid_negative_ts', 'make_zero',
      name,
    ]);
    partNames.push(name);
    onProgress?.(0.05 + (0.6 * (i + 1)) / clips.length, `Cortando trecho ${i + 1}/${clips.length}`);
  }

  // 2) Concatena via demuxer.
  const listContent = partNames.map((n) => `file '${n}'`).join('\n');
  await ffmpeg.writeFile('list.txt', new TextEncoder().encode(listContent));

  let warning: string | undefined;
  let srtUrl: string | undefined;

  const remapped = remapSubtitles(subtitles, clips);
  const wantsBurn = burnSubtitles && remapped.length > 0;

  if (wantsBurn) {
    // Precisa concatenar e depois aplicar o filtro subtitles (requer libass).
    await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'joined.mp4']);
    onProgress?.(0.7, 'Aplicando legendas');

    const srt = subtitlesToSrt(remapped);
    await ffmpeg.writeFile('subs.srt', new TextEncoder().encode(srt));

    try {
      await ffmpeg.exec([
        '-i', 'joined.mp4',
        '-vf', "subtitles=subs.srt:force_style='FontSize=22,Outline=1,Shadow=0'",
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-c:a', 'copy',
        'output.mp4',
      ]);
    } catch (err) {
      // Alguns builds do ffmpeg.wasm não incluem libass. Faz fallback:
      // entrega o vídeo sem legenda queimada + o arquivo .srt separado.
      warning =
        'Não foi possível queimar as legendas no vídeo neste ambiente. ' +
        'O vídeo foi exportado sem legendas embutidas e o arquivo .srt está disponível para download.';
      await ffmpeg.exec(['-i', 'joined.mp4', '-c', 'copy', 'output.mp4']);
      srtUrl = URL.createObjectURL(new Blob([srt], { type: 'text/plain' }));
    }
  } else {
    await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'output.mp4']);
    if (burnSubtitles && remapped.length === 0) {
      warning = 'Nenhuma legenda dentro dos trechos mantidos — vídeo exportado sem legendas.';
    }
  }

  onProgress?.(0.95, 'Finalizando');
  const data = (await ffmpeg.readFile('output.mp4')) as Uint8Array;
  const videoUrl = URL.createObjectURL(new Blob([data.buffer as ArrayBuffer], { type: 'video/mp4' }));

  // Limpeza do sistema de arquivos virtual.
  const cleanup = ['input.mp4', 'list.txt', 'joined.mp4', 'subs.srt', 'output.mp4', ...partNames];
  await Promise.all(cleanup.map((f) => ffmpeg.deleteFile(f).catch(() => {})));

  onProgress?.(1, 'Concluído');
  return { videoUrl, srtUrl, warning };
}
