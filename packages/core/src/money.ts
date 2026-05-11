export function formatKz(value: number) {
  return `${value.toLocaleString("pt-AO")} Kz`;
}

export function parseKz(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
