/**
 * Kolory danych raportu: kolor = zakres, wszędzie (podgląd, dashboard, PDF).
 * Para ze zwalidowanej palety kategorycznej — rozróżnialna przy daltonizmie
 * i z kontrastem ≥ 3:1 na białym tle. Granat marki nie przechodzi progu
 * chromy, więc nie jest kolorem serii.
 */
export const SCOPE_COLORS = {
  SCOPE_1: "#2a78d6",
  SCOPE_2: "#eb6834",
} as const;
