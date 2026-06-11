export function formatMoney(value: number, currency = "AOA") {
  const amount = Number.isFinite(value) ? value : 0;

  if (currency === "AOA") {
    return `${new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(amount)} Kz`;
  }

  return new Intl.NumberFormat("pt-AO", {
    currency,
    style: "currency"
  }).format(amount);
}
