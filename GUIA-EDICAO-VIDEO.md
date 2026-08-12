# Guia de Edição de Vídeo com IA

Síntese das duas habilidades estudadas para editarmos seus vídeos juntos:

- **edvid** (`fillrochaa/edvid`) — edição de vídeo por conversa: corte, cor,
  legendas, gráficos e trilha, para Reels/Shorts (vertical) e YouTube (horizontal).
  Motor baseado em **ffmpeg + WhisperX + Remotion**, roda **na sua máquina**.
- **remotion-motion-graphics** (`haidrrrry/claude-remotion-skill`) — o "olho" de
  motion design: como fazer o Remotion (vídeo em React) parecer profissional em vez
  de "vídeo genérico de IA".

Este arquivo é a nossa memória de método. Quando formos editar, seguimos daqui.

---

## A ideia central: áudio manda, imagem segue

O corte nasce da **fala**, não da imagem. Transcrevemos, achamos os silêncios,
cortamos neles, e só então cuidamos do visual. Isso vale para os dois formatos.

## As duas fases (com um portão entre elas)

**FASE 1 — Corte limpo + cor.** Melhor tomada de cada trecho, corte no silêncio,
imagem corrigida. Sem texto, sem gráfico. Termina num `cut.mp4` que **você aprova**.

**Portão:** nada da Fase 2 acontece antes de você aprovar o corte.

**FASE 2 + 3 — Camadas.** Legendas, gráficos, inserts, e trilha sonora. Tudo feito
em **Remotion** (não em texto queimado por ffmpeg), descrito por **um JSON**.

---

## FASE 1 — o passo a passo

1. **Inventário.** `ffprobe` em cada arquivo; transcrição local com WhisperX
   (alinhamento forçado → tempo de cada palavra medido, não estimado); empacota a
   transcrição em nível de frase (`takes_packed.md`) — 1/10 dos tokens do JSON cru.
2. **Pré-varredura.** Achar gaguejos, refações e palavras "esticadas" pelo Whisper
   (o fim de uma palavra escorrega pelo silêncio). Rodar `voice_levels.py` antes de
   cortar: a transcrição é **cega para volume** — um aparte sussurrado lê igual a
   uma fala normal. O que estiver baixo demais: reforçar com `gain_db` ou cortar.
3. **Conversa.** Eu descrevo o que vejo e pergunto o que importa (tipo de conteúdo,
   duração/formato alvo, ritmo, o que manter/cortar). Sem checklist fixo.
4. **Cor — detectar, não perguntar.** `detect_color.py` lê o perfil do arquivo:
   - **rec709 (normal)** → sem grade.
   - **LOG / HLG / PQ** → expansão medida da própria imagem (Apple Log tem preset).
   - Só `confidence: low` volta a te perguntar.
   Sempre mostro uma montagem de opções no MESMO frame e você escolhe o look.
5. **Proponho a estratégia** (4–8 frases) e **espero sua confirmação**.
6. **Executo.** Gero o `edl.json` (as decisões de corte), renderizo por segmento →
   concat sem perda → J-cut → loudnorm.
7. **Autoavaliação numérica** (`verify_cut.py`): duração, estalos, ar morto, frame
   preto, clipping, equilíbrio de volume. Só abro imagem no que for sinalizado.
8. **Mostro o `cut.mp4`** e espero aprovação. É o portão.

### Regras de ouro do corte (onde a Fase 1 dá errado)

- **Nunca cortar no meio de uma palavra** — encostar na fronteira de palavra.
- **Os tempos do Whisper NÃO são bordas de corte.** Início escorrega cedo, fim
  estica pelo silêncio. Bordas vêm de `speech_regions.py` (detecção acústica):
  início = onset −30ms, fim = offset +50–80ms (o rastro guarda o decaimento).
- **Silêncios ≥ 400ms** são os cortes mais limpos; 150–400ms com conferência;
  < 150ms é arriscado.
- **Preservar picos** (risadas, remates) — estender além do remate para pegar a reação.
- **Nivelar as tomadas:** presença ≠ audibilidade. Corrigir por trecho com `gain_db`,
  nunca com compressor global. Alvo: ~2 dB de diferença entre trechos.

### O J-cut (padrão da Fase 1)

As tomadas se **sobrepõem**, não se encostam. O áudio da tomada que entra começa
alguns frames antes da imagem dela — **a voz chega antes do rosto**. Isso remove o
respiro de silêncio que um concat direto deixa em cada junção (~130ms, pequeno no
papel, uma pausa clara na sala). Para apertar a costura, encurta-se a **cauda**, nunca
aumenta o lead (aumentar o lead empurra a imagem para dentro da fala seguinte).

---

## FASE 2 + 3 — as camadas (Remotion)

O corte foi aprovado. Agora as camadas, escolhidas por você por estilo. Regra dura:
**o código do template é imutável; o vídeo é descrito por um `edit-data.json`.** A
única exceção editável é `CustomGraphics.tsx`, só para gráficos sob medida.

### Short-form (Reels / TikTok / Shorts) — vertical 1080×1920

- **Câmera dinâmica:** zoom por corte (o que faz um "falante" parecer editado),
  push-in lento, e rastreamento de olhar (opcional).
- **Hook visual (primeiros ~4s):** headline de copy, sempre duas linhas.
- **Legendas:** seis estilos — karaokê, stacked, scatter (animados) + simples,
  serifada, clássica (estáticos). Karaokê: ≤3 palavras por linha, sobem de baixo,
  no terço inferior, dentro de uma largura segura de 720px (evita a barra de ações).
- **Inserts (terço superior):** cartões arredondados sincronizados com substantivos
  falados, Ken-Burns lento. Pexels para objetos concretos; gráficos sob medida para
  palavras animáveis.
- **Áudio:** whoosh na entrada dos cartões, pop nas formas, música ~0.12, e **sempre**
  um loudnorm final (voz+música+SFX somados clipam).

### Longform (YouTube) — 16:9 na resolução da fonte

- **Corte por retenção, não compressão.** Silêncios cortados com mais suavidade
  (só fillers/erros/ar morto > ~0.8s; manter batidas de 300–600ms).
- **Cold open** (5–15s do trecho mais forte de qualquer lugar) + intro curta.
- **Capítulos** e **legendas `.srt`** para o CC do YouTube (não queimadas).
- **B-roll** carrega a variedade visual; lower-thirds e callouts pontuam.

---

## Os 10 mandamentos do motion design (skill Remotion)

Aplicam-se a QUALQUER animação em Remotion, para não cair no "vídeo genérico de IA":

1. **Nunca interpolação linear.** Toda `interpolate()` com curva de easing; entrada
   prefere `spring()`. Sempre `extrapolateLeft/Right: "clamp"`.
2. **Entradas animam 2–3 propriedades juntas** (opacidade + translateY + escala).
   Um fade sozinho é proibido.
3. **Escalonar tudo** (stagger). Listas, palavras, cartões: offsets de 3–6 frames.
   Nada entra ao mesmo tempo.
4. **Saídas existem e são mais rápidas que as entradas** (~10 vs ~20 frames).
5. **Pilha de cinco camadas em cada cena:** mesh de fundo → assets → gráficos/tipo →
   grade de cor → grão + vinheta. Nunca fundo chapado.
6. **Toda imagem parada ganha Ken Burns** (escala 1→1.08 + pan). Todo vídeo usa
   `<OffthreadVideo>`, nunca `<Video>`.
7. **Elementos parados "respiram":** micro-movimento senoidal em qualquer coisa >2s
   na tela.
8. **Todo tempo deriva do `fps`** via `useVideoConfig()`. Sem número de frame mágico.
9. **Um objeto de tema** no topo do projeto (cores, easings, springs, fontes). Nunca
   um hex ou easing inline no componente.
10. **Renderizar, extrair frames, OLHAR, corrigir, re-renderizar.** Nunca entregar um
    render não verificado.

### Design (cor, tipo, ritmo, som)

- **Cor:** uma base + UMA cor "herói" + um acento. 60/30/10. A herói aparece em no
  máximo UM elemento por frame — ela guia o olho. Glow só na herói.
- **Tipografia:** fonte display (peso 600–800) nos títulos; sans limpa no corpo.
  Destacar UMA palavra por headline. Gaps em **px**, não `em` (em resolve contra o
  pai, ~16px, e some ao lado de tipo de 150px).
- **Ritmo de cena:** HIT → segura (15–20 frames parados) → constrói → HIT. Algo se
  move nos primeiros 15 frames. Nunca >90 frames sem um elemento visual novo. As
  **pausas** são ferramenta: movimento rápido → imobilidade total → próximo movimento.
- **Som = 50% da qualidade percebida.** Whoosh/click 2–3 frames ANTES do visual pousar
  (cedo soa sincronizado; tarde soa quebrado). Música baixa (~0.2–0.3), abaixada sob VO.

---

## Como vamos trabalhar (o ambiente importa)

O **edvid foi desenhado para rodar na SUA máquina** — a transcrição, o ffmpeg, o
servidor de preview com a timeline interativa, tudo local, sem chave de API. Duas
formas de tirarmos proveito disso:

### Opção A — Instalar o edvid na sua máquina (recomendado para o fluxo completo)

Pré-requisitos: `uv`, `ffmpeg`, `node`, `git`. Depois um comando instala a skill nos
agentes que você tiver (Claude Code, Codex, Antigravity):

```bash
uv run https://raw.githubusercontent.com/fillrochaa/edvid/main/edvid_install.py
```

Aí é só jogar os vídeos brutos numa pasta, abrir o agente dentro dela e dizer
*"edita esses vídeos num Reels"*. Tudo o que ele gera vai para uma subpasta `edit/` —
seus originais não são tocados.

### Opção B — Trabalharmos aqui, nesta sessão remota

Este ambiente na nuvem hoje **não tem ffmpeg nem yt-dlp** e não recebe seus arquivos
brutos automaticamente. Dá para instalar as ferramentas e montar projetos Remotion,
mas o material precisa estar acessível (link do YouTube via `yt-dlp`, ou arquivos
enviados). Melhor para: montar/ajustar os templates Remotion, escrever `edit-data.json`,
planejar a estratégia de corte a partir de uma transcrição.

---

## Referência rápida de comandos (edvid, Fase 1)

| Comando | Para quê |
|---|---|
| `ingest_url.py <url> --dest <dir> [--section 12:00-25:30]` | baixar de link (yt-dlp) |
| `transcribe.py <video> --edit-dir <edit> [--language pt]` | transcrição local (WhisperX) |
| `pack_transcripts.py --edit-dir <dir>` | transcrição → `takes_packed.md` (a leitura) |
| `speech_regions.py <video>` | onde há fala (bordas de corte) |
| `voice_levels.py <video> --edl edl.json` | volume da fala (rodar antes do EDL) |
| `detect_color.py <video>` | perfil de cor (rec709 vs LOG) |
| `render.py edl.json -o cut.mp4 --no-subtitles` | extrair+cortar+J-cut+loudnorm |
| `verify_cut.py edl.json cut.mp4` | autoavaliação numérica do corte |
| `grade.py <in> --candidates "..." --frame <t> -o cmp.png` | montagem de looks de cor |

---

_Síntese feita a partir de `fillrochaa/edvid` e `haidrrrry/claude-remotion-skill`._
