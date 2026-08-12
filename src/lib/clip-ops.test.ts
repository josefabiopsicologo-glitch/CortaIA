import { describe, expect, it } from "vitest";
import type { MediaClip, TextClip } from "@/types";
import {
  clampStartWithinNeighbors,
  clipTimelineEnd,
  moveClipTo,
  resizeTextClip,
  snapTime,
  splitClip,
  timeIsInsideClip,
  trimMediaClip,
} from "./clip-ops";

function makeMediaClip(overrides: Partial<MediaClip> = {}): MediaClip {
  return {
    id: "clip_a",
    trackId: "track_video",
    type: "video",
    assetId: "asset_1",
    timelineStart: 0,
    duration: 60,
    enabled: true,
    sourceStart: 0,
    sourceEnd: 60,
    position: { x: 0, y: 0 },
    scale: 1,
    rotation: 0,
    opacity: 1,
    volume: 1,
    ...overrides,
  };
}

function makeTextClip(overrides: Partial<TextClip> = {}): TextClip {
  return {
    id: "clip_t",
    trackId: "track_text",
    type: "text",
    text: "Olá",
    timelineStart: 0,
    duration: 10,
    enabled: true,
    position: { x: 0.5, y: 0.5 },
    fontFamily: "sans",
    fontSize: 64,
    fontWeight: 700,
    color: "#fff",
    backgroundColor: "transparent",
    align: "center",
    opacity: 1,
    rotation: 0,
    ...overrides,
  };
}

describe("clipTimelineEnd / timeIsInsideClip", () => {
  it("calcula o fim na timeline", () => {
    expect(clipTimelineEnd(makeMediaClip({ timelineStart: 5, duration: 10 }))).toBe(15);
  });
  it("detecta instante interno (exclusivo nas bordas)", () => {
    const c = makeMediaClip({ timelineStart: 0, duration: 60 });
    expect(timeIsInsideClip(c, 25)).toBe(true);
    expect(timeIsInsideClip(c, 0)).toBe(false);
    expect(timeIsInsideClip(c, 60)).toBe(false);
    expect(timeIsInsideClip(c, 61)).toBe(false);
  });
});

describe("splitClip (mídia)", () => {
  it("divide um clip 0-60 em 25 mantendo continuidade da fonte", () => {
    const clip = makeMediaClip();
    const result = splitClip(clip, 25, "clip_b");
    expect(result).not.toBeNull();
    const { left, right } = result!;

    // Esquerda mantém id e início; termina no ponto de corte.
    expect(left.id).toBe("clip_a");
    expect(left.timelineStart).toBe(0);
    expect(left.duration).toBe(25);
    expect((left as MediaClip).sourceStart).toBe(0);
    expect((left as MediaClip).sourceEnd).toBe(25);

    // Direita recebe novo id e continua de onde a esquerda parou.
    expect(right.id).toBe("clip_b");
    expect(right.timelineStart).toBe(25);
    expect(right.duration).toBe(35);
    expect((right as MediaClip).sourceStart).toBe(25);
    expect((right as MediaClip).sourceEnd).toBe(60);
  });

  it("preserva a soma das durações", () => {
    const clip = makeMediaClip({ duration: 60 });
    const { left, right } = splitClip(clip, 18.3, "clip_b")!;
    expect(left.duration + right.duration).toBeCloseTo(60, 10);
  });

  it("respeita sourceStart != 0 (clip já aparado)", () => {
    const clip = makeMediaClip({
      timelineStart: 10,
      duration: 20,
      sourceStart: 5,
      sourceEnd: 25,
    });
    const { left, right } = splitClip(clip, 20, "clip_b")!;
    expect((left as MediaClip).sourceEnd).toBe(15);
    expect((right as MediaClip).sourceStart).toBe(15);
    expect(right.timelineStart).toBe(20);
  });

  it("retorna null quando o corte cai fora do clip", () => {
    const clip = makeMediaClip();
    expect(splitClip(clip, 0, "x")).toBeNull();
    expect(splitClip(clip, 60, "x")).toBeNull();
    expect(splitClip(clip, 999, "x")).toBeNull();
  });
});

describe("splitClip (texto)", () => {
  it("divide apenas a duração", () => {
    const clip = makeTextClip({ duration: 10 });
    const { left, right } = splitClip(clip, 4, "clip_t2")!;
    expect(left.duration).toBe(4);
    expect(right.duration).toBe(6);
    expect(right.timelineStart).toBe(4);
    expect((right as TextClip).text).toBe("Olá");
  });
});

describe("trimMediaClip", () => {
  it("apara o fim mantendo o início na timeline", () => {
    const clip = makeMediaClip();
    const next = trimMediaClip(clip, { sourceEnd: 40 }, 60);
    expect(next.sourceEnd).toBe(40);
    expect(next.duration).toBe(40);
    expect(next.timelineStart).toBe(0);
  });

  it("apara o início deslocando o timelineStart pelo mesmo delta", () => {
    const clip = makeMediaClip({ timelineStart: 10 });
    const next = trimMediaClip(clip, { sourceStart: 5 }, 60);
    expect(next.sourceStart).toBe(5);
    expect(next.duration).toBe(55);
    expect(next.timelineStart).toBe(15);
  });

  it("limita o out-point à duração do asset", () => {
    const clip = makeMediaClip();
    const next = trimMediaClip(clip, { sourceEnd: 999 }, 60);
    expect(next.sourceEnd).toBe(60);
  });

  it("rejeita duração menor que o mínimo", () => {
    const clip = makeMediaClip({ sourceStart: 0, sourceEnd: 60 });
    const next = trimMediaClip(clip, { sourceStart: 59.99 }, 60);
    // Operação inválida -> clip inalterado.
    expect(next).toEqual(clip);
  });
});

describe("moveClipTo", () => {
  it("move para novo início", () => {
    expect(moveClipTo(makeMediaClip(), 12).timelineStart).toBe(12);
  });
  it("nunca fica negativo", () => {
    expect(moveClipTo(makeMediaClip(), -5).timelineStart).toBe(0);
  });
});

describe("resizeTextClip", () => {
  it("estende a borda direita", () => {
    const clip = makeTextClip({ timelineStart: 0, duration: 10 });
    const next = resizeTextClip(clip, { endDelta: 5 });
    expect(next.duration).toBe(15);
    expect(next.timelineStart).toBe(0);
  });
  it("move a borda esquerda ajustando início e duração", () => {
    const clip = makeTextClip({ timelineStart: 4, duration: 10 });
    const next = resizeTextClip(clip, { startDelta: 3 });
    expect(next.timelineStart).toBe(7);
    expect(next.duration).toBe(7);
  });
  it("não deixa a borda esquerda passar do início do projeto", () => {
    const clip = makeTextClip({ timelineStart: 2, duration: 10 });
    const next = resizeTextClip(clip, { startDelta: -5 });
    expect(next.timelineStart).toBe(0);
    expect(next.duration).toBe(12);
  });
  it("respeita a duração mínima", () => {
    const clip = makeTextClip({ timelineStart: 0, duration: 5 });
    const next = resizeTextClip(clip, { endDelta: -100 }, 0.1);
    expect(next.duration).toBe(0.1);
  });
});

describe("clampStartWithinNeighbors", () => {
  it("sem vizinhos, apenas evita início negativo", () => {
    expect(clampStartWithinNeighbors(-5, 10)).toBe(0);
    expect(clampStartWithinNeighbors(7, 10)).toBe(7);
  });
  it("não ultrapassa o próximo clip", () => {
    // duração 10, próximo começa em 30 -> início máximo 20
    expect(clampStartWithinNeighbors(25, 10, 0, 30)).toBe(20);
  });
  it("não invade o clip anterior", () => {
    expect(clampStartWithinNeighbors(10, 10, 15)).toBe(15);
  });
  it("sem espaço entre vizinhos, fixa após o anterior", () => {
    // prevEnd 15, nextStart 20, duração 10 -> maxStart(10) < minStart(15)
    expect(clampStartWithinNeighbors(18, 10, 15, 20)).toBe(15);
  });
});

describe("snapTime", () => {
  it("gruda no alvo mais próximo dentro do limite", () => {
    expect(snapTime(10.2, [0, 10, 25], 0.5)).toBe(10);
  });
  it("mantém o valor quando nenhum alvo está próximo", () => {
    expect(snapTime(10.2, [0, 25], 0.5)).toBe(10.2);
  });
  it("escolhe o alvo mais próximo entre vários", () => {
    expect(snapTime(9.9, [9.5, 10.0], 1)).toBe(10.0);
  });
});
