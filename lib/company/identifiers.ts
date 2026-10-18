const digitsOf = (s: string) => s.split("").map(Number);

function weightedSum(digits: number[], weights: number[]): number {
  return weights.reduce((sum, w, i) => sum + w * digits[i]!, 0);
}

export function normalizeCompanyNip(raw: string): string | null {
  const s = raw.replace(/[\s-]/g, "").replace(/^PL/i, "");
  if (!/^\d{10}$/.test(s)) return null;
  const d = digitsOf(s);
  const check = weightedSum(d, [6, 5, 7, 2, 3, 4, 5, 6, 7]) % 11;
  return check !== 10 && check === d[9] ? s : null;
}

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

export function normalizeKrs(raw: string): string | null {
  const s = raw.replace(/[\s-]/g, "");
  return /^\d{1,10}$/.test(s) && !/^0+$/.test(s) ? s.padStart(10, "0") : null;
}

export function formatNip(nip: string): string {
  return /^\d{10}$/.test(nip)
    ? `${nip.slice(0, 3)}-${nip.slice(3, 6)}-${nip.slice(6, 8)}-${nip.slice(8)}`
    : nip;
}

export function buyerNipWarning(
  buyerNip: string | undefined,
  companyNip: string | null | undefined,
): string | null {
  if (!buyerNip || !companyNip) return null;
  const buyer = buyerNip.replace(/[\s-]/g, "").replace(/^PL/i, "");
  if (buyer === companyNip) return null;
  return `Nabywca na fakturze (NIP ${formatNip(buyer)}) to nie Twoja firma (NIP ${formatNip(companyNip)}) — sprawdź, czy faktura dotyczy tej firmy.`;
}
