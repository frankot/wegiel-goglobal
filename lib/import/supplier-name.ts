/** Supplier name matching */

const LEGAL_FORM =
  /\s(?:sp|spolka|s a|sa|s c|sc|s k a)\b.*$/;

export function supplierCoreName(name: string | null | undefined): string {
  if (!name) return "";
  const plain = name
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return (" " + plain).replace(LEGAL_FORM, "").trim();
}

export function sameSupplierName(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = supplierCoreName(a);
  const y = supplierCoreName(b);
  if (x.length < 3 || y.length < 3) return false;
  return x === y || x.startsWith(y + " ") || y.startsWith(x + " ");
}
