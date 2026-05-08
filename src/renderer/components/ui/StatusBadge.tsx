import { Badge } from "./Badge";

export function StatusBadge({ status }: { status: string }) {
  const tone = status.toLowerCase().includes("inativo") || status.toLowerCase().includes("atraso") ? "red" : status.toLowerCase().includes("baixo") ? "orange" : "lime";
  return <Badge tone={tone}>{status}</Badge>;
}
