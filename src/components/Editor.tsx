'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import UploadDropzone from './UploadDropzone';
import VideoPlayer, { PlayerHandle } from './VideoPlayer';
import Timeline from './Timeline';
import ExportDialog from './ExportDialog';
import { useEditorState } from '@/hooks/useEditorState';
import { detectSilence, silenceToClips, DEFAULT_SILENCE } from '@/lib/silence';
import { transcribeToSubtitles, subtitlesToSrt } from '@/lib/subtitles';
import { formatTime } from '@/lib/format';
import { timelineDuration } from '@/lib/types';

type Busy = null | { label: string };

export default function Editor() {
  const editor = useEditorState();
  const playerRef = useRef<PlayerHandle>(null);

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [notice, setNotice] = useState<string>('');
  const [showExport, setShowExport] = useState(false);

  // Carrega o arquivo e lê a duração real via metadados.
  const handleFile = useCallback(
    (f: File) => {
      const url = URL.createObjectURL(f);
      setFile(f);
      setVideoUrl(url);
      setNotice('');
      const probe = document.createElement('video');
      probe.preload = 'metadata';
      probe.src = url;
      probe.onloadedmetadata = () => {
        editor.init(probe.duration || 0);
        setCurrentTime(0);
      };
    },
    [editor]
  );

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const seek = useCallback((t: number) => {
    setCurrentTime(t);
    playerRef.current?.seek(t);
  }, []);

  const togglePlay = useCallback(() => {
    if (playing) playerRef.current?.pause();
    else playerRef.current?.play();
  }, [playing]);

  // --- Cortes automáticos (detecção de silêncio) ---
  const runAutoCut = useCallback(async () => {
    if (!file) return;
    setBusy({ label: 'Analisando áudio e detectando silêncios…' });
    setNotice('');
    try {
      const { regions, duration } = await detectSilence(file, DEFAULT_SILENCE);
      const clips = silenceToClips(regions, duration || editor.duration, DEFAULT_SILENCE.padding);
      editor.setClips(clips);
      setNotice(
        `Cortes automáticos aplicados: ${regions.length} silêncio(s) removido(s), ${clips.length} trecho(s) mantido(s).`
      );
    } catch (err) {
      setNotice(`Falha ao analisar o áudio: ${String((err as Error).message || err)}`);
    } finally {
      setBusy(null);
    }
  }, [file, editor]);

  // --- Legendas automáticas (IA) ---
  const runTranscribe = useCallback(async () => {
    if (!file) return;
    setBusy({ label: 'Gerando legendas com IA…' });
    setNotice('');
    try {
      const subs = await transcribeToSubtitles(file, 'pt');
      editor.setSubtitles(subs);
      setNotice(`Legendas geradas: ${subs.length} trecho(s).`);
    } catch (err) {
      setNotice(String((err as Error).message || err));
    } finally {
      setBusy(null);
    }
  }, [file, editor]);

  const downloadSrt = useCallback(() => {
    if (!editor.subtitles.length) return;
    const blob = new Blob([subtitlesToSrt(editor.subtitles)], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'legendas.srt';
    a.click();
    URL.revokeObjectURL(a.href);
  }, [editor.subtitles]);

  if (!file) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Header />
        <div className="mt-8">
          <UploadDropzone onFile={handleFile} />
        </div>
      </div>
    );
  }

  const finalDuration = timelineDuration(editor.clips);
  const selected = editor.clips.find((c) => c.id === editor.selectedClipId) || null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Header />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* Coluna principal: player + timeline */}
        <div>
          <VideoPlayer
            ref={playerRef}
            src={videoUrl}
            clips={editor.clips}
            subtitles={editor.subtitles}
            onTime={setCurrentTime}
            onPlayState={setPlaying}
          />

          {/* Controles de transporte */}
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-600"
            >
              {playing ? '❚❚' : '▶'}
            </button>
            <span className="font-mono text-sm text-neutral-400">
              {formatTime(currentTime)} <span className="text-neutral-600">/ {formatTime(editor.duration)}</span>
            </span>
            <span className="ml-auto text-xs text-neutral-500">
              Timeline final: <span className="text-neutral-300">{formatTime(finalDuration)}</span>
            </span>
          </div>

          {/* Barra de ferramentas de edição */}
          <div className="mt-3 flex flex-wrap gap-2">
            <ToolBtn onClick={() => editor.splitAt(currentTime)} title="Dividir no playhead (S)">
              ✂️ Dividir
            </ToolBtn>
            <ToolBtn
              onClick={() => selected && editor.deleteClip(selected.id)}
              disabled={!selected}
              title="Excluir trecho selecionado"
            >
              🗑️ Excluir trecho
            </ToolBtn>
            <ToolBtn
              onClick={() => selected && editor.moveClip(selected.id, -1)}
              disabled={!selected}
            >
              ◀ Mover
            </ToolBtn>
            <ToolBtn
              onClick={() => selected && editor.moveClip(selected.id, 1)}
              disabled={!selected}
            >
              Mover ▶
            </ToolBtn>
            <div className="mx-1 w-px self-stretch bg-neutral-800" />
            <ToolBtn onClick={editor.undo} disabled={!editor.canUndo}>↶ Desfazer</ToolBtn>
            <ToolBtn onClick={editor.redo} disabled={!editor.canRedo}>↷ Refazer</ToolBtn>
          </div>

          <div className="mt-4">
            <Timeline
              duration={editor.duration}
              clips={editor.clips}
              subtitles={editor.subtitles}
              currentTime={currentTime}
              selectedClipId={editor.selectedClipId}
              onSeek={seek}
              onSelectClip={editor.selectClip}
            />
          </div>
        </div>

        {/* Painel lateral: recursos de IA + exportar */}
        <aside className="space-y-4">
          <Panel title="🤖 Cortes automáticos">
            <p className="text-xs text-neutral-400">
              Detecta e remove silêncios, mantendo só os melhores momentos.
            </p>
            <button
              onClick={runAutoCut}
              disabled={!!busy}
              className="mt-3 w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              Aplicar cortes automáticos
            </button>
          </Panel>

          <Panel title="💬 Legendas por IA">
            <p className="text-xs text-neutral-400">
              Transcreve o áudio e gera legendas sincronizadas automaticamente.
            </p>
            <button
              onClick={runTranscribe}
              disabled={!!busy}
              className="mt-3 w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              Gerar legendas
            </button>
            {editor.subtitles.length > 0 && (
              <button
                onClick={downloadSrt}
                className="mt-2 w-full rounded-lg border border-neutral-700 py-2 text-xs text-neutral-300 hover:bg-neutral-800"
              >
                Baixar .srt ({editor.subtitles.length})
              </button>
            )}
          </Panel>

          <Panel title="📤 Exportar">
            <p className="text-xs text-neutral-400">
              Renderiza o vídeo final em MP4 com seus cortes e legendas.
            </p>
            <button
              onClick={() => setShowExport(true)}
              disabled={!!busy || !editor.clips.length}
              className="mt-3 w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Exportar vídeo
            </button>
          </Panel>

          <button
            onClick={() => {
              editor.reset();
              setFile(null);
              setVideoUrl('');
            }}
            className="w-full rounded-lg border border-neutral-800 py-2 text-xs text-neutral-500 hover:bg-neutral-900"
          >
            Trocar de vídeo
          </button>
        </aside>
      </div>

      {(busy || notice) && (
        <div className="fixed inset-x-0 bottom-4 z-40 mx-auto max-w-md px-4">
          <div className="rounded-lg bg-neutral-800 px-4 py-3 text-sm shadow-lg ring-1 ring-neutral-700">
            {busy ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                {busy.label}
              </span>
            ) : (
              <span className="flex items-start justify-between gap-3">
                <span className="text-neutral-200">{notice}</span>
                <button onClick={() => setNotice('')} className="text-neutral-500 hover:text-neutral-300">
                  ✕
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {showExport && file && (
        <ExportDialog
          file={file}
          clips={editor.clips}
          subtitles={editor.subtitles}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-lg font-black text-white">
        C
      </div>
      <div>
        <h1 className="text-lg font-bold leading-none">
          Corta<span className="text-brand">IA</span>
        </h1>
        <p className="text-xs text-neutral-500">Edit Pro — editor de vídeo com IA</p>
      </div>
    </header>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
