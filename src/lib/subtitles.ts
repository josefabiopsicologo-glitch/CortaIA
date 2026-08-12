// Extração de áudio + chamada à transcrição para gerar legendas automáticas.

import type { Subtitle } from './types';
import { uid, formatSrtTime } from './format';

interface TranscribeSegment {
  start: number;
  end: number;
  text: string;
}

/**
 * Envia o áudio (ou vídeo) ao endpoint /api/transcribe e converte a resposta
 * em legendas do editor. Lança erro com mensagem amigável em caso de falha.
 */
export async function transcribeToSubtitles(file: Blob, language = 'pt'): Promise<Subtitle[]> {
  const form = new FormData();
  form.append('file', file, 'input.mp4');
  form.append('language', language);

  const res = await fetch('/api/transcribe', { method: 'POST', body: form });

  if (res.status === 501) {
    throw new Error(
      'Transcrição por IA não configurada. Defina OPENAI_API_KEY no servidor ou adicione legendas manualmente.'
    );
  }
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Falha na transcrição (${res.status}). ${msg}`.trim());
  }

  const json = (await res.json()) as { segments?: TranscribeSegment[]; text?: string };
  const segments = json.segments ?? [];

  if (!segments.length && json.text) {
    // Sem segmentos temporizados: cria uma única legenda cobrindo o começo.
    return [{ id: uid('sub'), start: 0, end: 4, text: json.text.trim() }];
  }

  return segments
    .filter((s) => s.text?.trim())
    .map((s) => ({
      id: uid('sub'),
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    }));
}

/** Gera um arquivo .srt a partir das legendas. */
export function subtitlesToSrt(subs: Subtitle[]): string {
  return subs
    .slice()
    .sort((a, b) => a.start - b.start)
    .map((s, i) => `${i + 1}\n${formatSrtTime(s.start)} --> ${formatSrtTime(s.end)}\n${s.text}\n`)
    .join('\n');
}
