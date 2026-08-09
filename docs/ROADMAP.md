# Roadmap — CortaIA

Ordem de construção guiada por: **primeiro um editor confiável, depois IA.**
Qualidade acima de quantidade.

## Definição de MVP funcional

O MVP estará pronto quando o usuário conseguir: abrir o app → importar vídeo →
assistir → ver na timeline → navegar → cortar início/fim → dividir → excluir →
adicionar texto → trocar 9:16 / 1:1 / 16:9 → importar áudio → controlar volume →
exportar → abrir o arquivo exportado → confirmar que corresponde à edição.

## Fases

| Fase | Tema | Status |
| ---- | ---- | ------ |
| 0 | Diagnóstico + vulnerabilidades | ✅ Concluída |
| 1 | Editor Shell (TopBar, Sidebar, Canvas, Properties, Timeline) | ✅ Concluída |
| 2 | Modelo de dados + store + testes | ✅ Concluída |
| 3 | Upload + Player robustos (metadata, seek, múltiplos clips) | 🟡 Parcial (upload + preview single-clip) |
| 4 | Timeline (trim por handles, snap, seleção múltipla) | 🟡 Parcial (régua, playhead, split, zoom) |
| 5 | Split + Delete + atalhos | ✅ Concluída |
| 6 | Trim (handles visuais; lógica pura já testada) | ⬜ Pendente |
| 7 | Texto (add, propriedades, canvas, timeline) | ✅ Concluída |
| 8 | Formatos 9:16 / 1:1 / 16:9 | ✅ Concluída |
| 9 | Áudio (track, playback sincronizado, volume, mute) | 🟡 Parcial (upload + track) |
| 10 | Video Engine (abstração de operações) | ⬜ Pendente |
| 11 | Exportação (RenderPlan → FFmpeg → MP4) | ⬜ Pendente |
| 12 | Undo/Redo | ✅ Concluída |
| 13 | Polimento (UX, loading, erros, acessibilidade, performance) | ⬜ Contínuo |
| 14 | QA (checklist completo) | 🟡 Contínuo |

## Próximas prioridades (curto prazo)

1. **Trim por handles** na timeline (FASE 6) — a lógica `trimMediaClip` já existe
   e é testada; falta a UI de arrastar bordas.
2. **Drag & drop** de clips na timeline e **snap** ao playhead/vizinhos.
3. **Video Engine** (FASE 10) + **Exportação** (FASE 11) com FFmpeg WASM sob
   demanda e progresso real.
4. **Áudio**: sincronização de reprodução do áudio com o vídeo no preview.
5. **Thumbnails** no clip de vídeo e **waveform** no de áudio (arquitetura já
   prevista; não obrigatórios no primeiro MVP).

## Futuro (pós-MVP, não implementar agora)

- **Transcrição** (`TranscriptSegment`) e **legendas** palavra por palavra
  (estilos: Clean, Podcast, Dynamic, Minimal, Educational, Professional).
- **Remover silêncios** (detecção → sugestão → confirmação).
- **Smart Cut** e **Gerador de Shorts** (melhores momentos → Shorts com legendas
  e enquadramento).
- **Pontuação de conteúdo** (Hook/Clarity/Emotion/Retention/Standalone Score).
- **Editor por IA** (chat no editor → comando estruturado → validação → ação).
- **Toalha de Retalhos**: transformar um vídeo longo em uma **série** de Shorts
  conectados, com ganchos encadeados entre eles.
- **Brand Kit**, **Auto Reflow**, **Face Tracking**, **Zoom automático**,
  **B-roll**, **remoção de vícios de linguagem**, **multiplataforma**.
- **SaaS**: usuários, organizações, projetos, renders, assinaturas, créditos.

## O que NÃO construir agora

Autenticação, pagamentos, assinaturas, painel admin, marketplace, colaboração em
tempo real, app mobile, dezenas de transições/efeitos, infraestrutura
distribuída prematura. Primeiro, provar o editor.
