'use client';

import { useCallback, useRef, useState } from 'react';

interface Props {
  onFile: (file: File) => void;
}

export default function UploadDropzone({ onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      if (!file.type.startsWith('video/')) {
        alert('Selecione um arquivo de vídeo (MP4, MOV, WebM…).');
        return;
      }
      onFile(file);
    },
    [onFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 text-center transition
        ${dragging ? 'border-brand bg-brand/10' : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500'}`}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/20 text-3xl">🎬</div>
      <h2 className="text-xl font-semibold">Importe seu vídeo</h2>
      <p className="mt-2 max-w-sm text-sm text-neutral-400">
        Arraste um arquivo aqui ou clique para selecionar. Tudo é processado no seu navegador — o vídeo não sai do seu
        computador.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
