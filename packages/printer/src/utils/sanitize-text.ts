export function sanitizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n\r\t]/g, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}

export function singleLine(value: unknown, maxLength?: number) {
  const text = sanitizeText(value).replace(/\s+/g, " ");
  return typeof maxLength === "number" && maxLength > 0 ? text.slice(0, maxLength) : text;
}
