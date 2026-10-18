const nf = (min: number, max: number) =>
  new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });

export function formatKg(value: string | number): string {
  return nf(0, 3).format(Number(value));
}

export function formatTon(value: string | number): string {
  return nf(0, 6).format(Number(value));
}

export function formatQuantity(value: string | number): string {
  return nf(0, 4).format(Number(value));
}

export function formatFactor(value: string | number): string {
  return nf(0, 6).format(Number(value));
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pl-PL");
}

export function formatPeriod(
  from: Date | string | null | undefined,
  to: Date | string | null | undefined,
): string {
  if (!from && !to) return "—";
  return `${formatDate(from)} – ${formatDate(to)}`;
}

export function parseDecimalInput(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .trim()
    .replace(/[\s  ]/g, "")
    .replace(",", ".");
  if (cleaned === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return cleaned;
}
