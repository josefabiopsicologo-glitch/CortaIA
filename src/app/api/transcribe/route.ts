// Rota de transcrição por IA para legendas automáticas.
// Usa a API compatível com OpenAI Whisper (verbose_json = segmentos com tempos).
// Sem OPENAI_API_KEY configurada, retorna 501 e a UI cai no modo manual.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Transcrição por IA não configurada (OPENAI_API_KEY ausente).' },
      { status: 501 }
    );
  }

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.TRANSCRIBE_MODEL || 'whisper-1';

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Requisição inválida (esperado multipart/form-data).' }, { status: 400 });
  }

  const file = form.get('file');
  const language = (form.get('language') as string) || 'pt';
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Arquivo de mídia ausente.' }, { status: 400 });
  }

  const upstream = new FormData();
  upstream.append('file', file, 'input.mp4');
  upstream.append('model', model);
  upstream.append('language', language);
  upstream.append('response_format', 'verbose_json');

  try {
    const res = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Provedor de transcrição retornou ${res.status}.`, detail },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { text?: string; segments?: WhisperSegment[] };
    const segments = (data.segments ?? []).map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text,
    }));

    return NextResponse.json({ text: data.text ?? '', segments });
  } catch (err) {
    return NextResponse.json(
      { error: 'Erro ao contatar o provedor de transcrição.', detail: String(err) },
      { status: 502 }
    );
  }
}
