export function formatDate(value: Date | string = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("pt-AO", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}
