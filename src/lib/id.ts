/**
 * Geração de ids curtos e únicos para entidades do editor.
 * Usa crypto.randomUUID quando disponível (browser moderno / Node 19+),
 * com fallback simples para ambientes sem crypto.
 */

export function createId(prefix = ""): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  const short = uuid.replace(/-/g, "").slice(0, 12);
  return prefix ? `${prefix}_${short}` : short;
}
