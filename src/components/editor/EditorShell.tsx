"use client";

import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { PropertiesPanel } from "./PropertiesPanel";
import { VideoCanvas } from "@/components/canvas/VideoCanvas";
import { PlayerControls } from "@/components/player/PlayerControls";
import { Timeline } from "@/components/timeline/Timeline";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

/**
 * EditorShell — layout principal do editor.
 *
 *  TOP BAR
 *  SIDEBAR | CANVAS/PLAYER | PROPERTIES
 *  TIMELINE
 */
export function EditorShell() {
  useKeyboardShortcuts();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <TopBar />

      <div className="flex min-h-0 flex-1">
        <Sidebar />

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <VideoCanvas />
          </div>
          <PlayerControls />
        </main>

        <PropertiesPanel />
      </div>

      {/* Timeline ocupa uma faixa fixa na base */}
      <div className="h-64 shrink-0 border-t border-border">
        <Timeline />
      </div>
    </div>
  );
}
