"use client";

/**
 * Atalhos globais do editor (seção 42 da spec).
 *
 * Regra importante: nenhum atalho dispara enquanto o usuário está digitando
 * em input/textarea/contenteditable.
 */

import { useEffect } from "react";
import { useEditorStore } from "@/store/editor-store";
import { usePlaybackStore } from "@/store/playback-store";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    el.isContentEditable
  );
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      const editor = useEditorStore.getState();
      const mod = e.metaKey || e.ctrlKey;

      // Undo / Redo
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        editor.redo();
        return;
      }

      // Play / Pause
      if (e.code === "Space") {
        e.preventDefault();
        usePlaybackStore.getState().toggle();
        return;
      }

      // Duplicar clip selecionado
      if (mod && e.key.toLowerCase() === "d") {
        const id = editor.selectedClipId;
        if (id) {
          e.preventDefault();
          editor.duplicateClip(id);
        }
        return;
      }

      // Delete clip selecionado
      if (e.key === "Delete" || e.key === "Backspace") {
        const id = editor.selectedClipId;
        if (id) {
          e.preventDefault();
          editor.removeClip(id);
        }
        return;
      }

      // Nudge do clip selecionado com as setas (Shift = passo maior)
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const id = editor.selectedClipId;
        if (id) {
          e.preventDefault();
          const step = e.shiftKey ? 1 : 0.1;
          editor.nudgeClip(id, e.key === "ArrowRight" ? step : -step);
        }
        return;
      }

      // Split no playhead
      if (e.key.toLowerCase() === "s" && !mod) {
        const id = editor.selectedClipId;
        if (id) {
          e.preventDefault();
          editor.splitClipAt(id, usePlaybackStore.getState().currentTime);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
