'use client';

import { useEffect, useRef, useState } from 'react';
import { exportVideo, ExportResult } from '@/lib/export';
import type { Clip, Subtitle } from '@/lib/types';

interface Props {
  file: Blob;
  clips: Clip[];
  subtitles: Subtitle[];
  onClose: () => void;
}

export default function ExportDialog({ file, clips, subtitles, onClose }: Props) {
  const [burn, setBurn] = useState(subtitles.length > 0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (result?.videoUrl) URL.revokeObjectURL(result.videoUrl);
      if (result?.srtUrl) URL.revokeObjectURL(result.srtUrl);
    };
  }, [result]);

  const run = async () => {
    setRunning(true);
    setError('');
    setProgress(0);
    try {
      const res = await exportVideo(file, {
        clips,
        subtitles,
        burnSubtitles: burn,
        onProgress: (r, s) => {
          setProgress(r);
          setStage(s);
        },
      });
      setResult(res);
    } catch (err) {
      setError(String((err as Error).message || err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={running ? undefined : onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-neutral-900 p-6 ring-1 ring-neutral-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">Exportar vídeo</h2>
        <p className="mt-1 text-xs text-neutral-400">
          A renderização acontece no seu navegador (ffmpeg.wasm). Pode levar alguns minutos em vídeos longos.
        </p>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={burn}
            onChange={(e) => setBurn(e.target.checked)}
            disabled={running || subtitles.length === 0}
            className="h-4 w-4 accent-brand"
          />
          Queimar legendas no vídeo
          {subtitles.length === 0 && <span className="text-neutral-600">(sem legendas)</span>}
        </label>

        {running && (
          <div className="mt-5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
              <div className="h-full bg-brand transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              {stage} — {Math.round(progress * 100)}%
            </p>
          </div>
        )}

        {error && <p className="mt-4 rounded-lg bg-red-950 px-3 py-2 text-xs text-red-300">{error}</p>}

        {result && (
          <div className="mt-5 space-y-3">
            {result.warning && (
              <p className="rounded-lg bg-amber-950 px-3 py-2 text-xs text-amber-300">{result.warning}</p>
            )}
            <video src={result.videoUrl} controls className="w-full rounded-lg" />
            <div className="flex gap-2">
              <a
                href={result.videoUrl}
                download="cortaia-export.mp4"
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Baixar MP4
              </a>
              {result.srtUrl && (
                <a
                  href={result.srtUrl}
                  download="legendas.srt"
                  className="rounded-lg border border-neutral-700 px-4 py-2 text-center text-sm text-neutral-200 hover:bg-neutral-800"
                >
                  Baixar .srt
                </a>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2" ref={logRef}>
          <button
            onClick={onClose}
            disabled={running}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
          >
            {result ? 'Fechar' : 'Cancelar'}
          </button>
          {!result && (
            <button
              onClick={run}
              disabled={running || !clips.length}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {running ? 'Renderizando…' : 'Iniciar exportação'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
