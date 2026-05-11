import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`panel min-w-0 ${className}`}>{children}</section>;
}
