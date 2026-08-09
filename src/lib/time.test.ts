import { describe, expect, it } from "vitest";
import { clamp, formatTimecode, pixelsToTime, timeToPixels } from "./time";

describe("clamp", () => {
  it("mantém valores dentro do intervalo", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it("limita abaixo e acima", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });
  it("é robusto a min > max", () => {
    expect(clamp(5, 10, 0)).toBe(10);
  });
});

describe("timeToPixels / pixelsToTime", () => {
  it("converte tempo para pixels", () => {
    expect(timeToPixels(2, 50)).toBe(100);
  });
  it("converte pixels para tempo", () => {
    expect(pixelsToTime(100, 50)).toBe(2);
  });
  it("é inverso consistente (round-trip)", () => {
    const pps = 37.5;
    for (const t of [0, 1.3, 12.75, 60]) {
      expect(pixelsToTime(timeToPixels(t, pps), pps)).toBeCloseTo(t, 10);
    }
  });
  it("evita divisão por zero", () => {
    expect(pixelsToTime(100, 0)).toBe(0);
  });
});

describe("formatTimecode", () => {
  it("formata MM:SS", () => {
    expect(formatTimecode(0)).toBe("00:00");
    expect(formatTimecode(65)).toBe("01:05");
    expect(formatTimecode(3599)).toBe("59:59");
  });
  it("formata com décimos", () => {
    expect(formatTimecode(65.4, true)).toBe("01:05.4");
  });
  it("trata valores inválidos como zero", () => {
    expect(formatTimecode(-10)).toBe("00:00");
    expect(formatTimecode(NaN)).toBe("00:00");
  });
});
