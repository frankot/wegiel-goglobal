/**
 * Identyfikatory firmy (NIP, REGON, KRS) — normalizacja i sumy kontrolne.
 * Czysta logika bez zależności, używana w formularzu, akcji i imporcie.
 */

const digitsOf = (s: string) => s.split("").map(Number);

function weightedSum(digits: number[], weights: number[]): number {
  return weights.reduce((sum, w, i) => sum + w * digits[i]!, 0);
}

/**
 * NIP: usuwa spacje, myślniki i prefiks „PL", sprawdza sumę kontrolną.
 * Zwraca 10 cyfr albo null — literówka w NIP-ie odcięłaby ostrzeżenia importu.
 */
export function normalizeCompanyNip(raw: string): string | null {
  const s = raw.replace(/[\s-]/g, "").replace(/^PL/i, "");
  if (!/^\d{10}$/.test(s)) return null;
  const d = digitsOf(s);
  const check = weightedSum(d, [6, 5, 7, 2, 3, 4, 5, 6, 7]) % 11;
  return check !== 10 && check === d[9] ? s : null;
}

/** REGON: 9 lub 14 cyfr; 14-cyfrowy zawiera poprawny 9-cyfrowy prefiks. */
export function normalizeRegon(raw: string): string | null {
  const s = raw.replace(/[\s-]/g, "");
  if (!/^(\d{9}|\d{14})$/.test(s)) return null;
  const d = digitsOf(s);
  const valid = (digits: number[], weights: number[]) =>
    weightedSum(digits, weights) % 11 % 10 === digits[weights.length];
  if (!valid(d, [8, 9, 2, 3, 4, 5, 6, 7])) return null;
  if (s.length === 14 && !valid(d, [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8])) return null;
  return s;
}

/** KRS: do 10 cyfr, uzupełniany zerami z przodu (zapis „0000123456"). */
export function normalizeKrs(raw: string): string | null {
  const s = raw.replace(/[\s-]/g, "");
  return /^\d{1,10}$/.test(s) && !/^0+$/.test(s) ? s.padStart(10, "0") : null;
}

/** Zapis NIP-u do wyświetlenia: 123-456-78-90. */
export function formatNip(nip: string): string {
  return /^\d{10}$/.test(nip)
    ? `${nip.slice(0, 3)}-${nip.slice(3, 6)}-${nip.slice(6, 8)}-${nip.slice(8)}`
    : nip;
}

/**
 * Ostrzeżenie, gdy faktura jest wystawiona na inny podmiot niż firma.
 * Bez NIP-u firmy albo nabywcy nie ma czego porównać — wtedy null.
 */
export function buyerNipWarning(
  buyerNip: string | undefined,
  companyNip: string | null | undefined,
): string | null {
  if (!buyerNip || !companyNip) return null;
  const buyer = buyerNip.replace(/[\s-]/g, "").replace(/^PL/i, "");
  if (buyer === companyNip) return null;
  return `Nabywca na fakturze (NIP ${formatNip(buyer)}) to nie Twoja firma (NIP ${formatNip(companyNip)}) — sprawdź, czy faktura dotyczy tej firmy.`;
}
