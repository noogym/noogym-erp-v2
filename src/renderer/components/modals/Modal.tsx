import { X } from "lucide-react";
import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}

const sizes = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
  full: "max-w-6xl"
};

export function Modal({ open, title, description, size = "lg", children, footer, onClose }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
      <section className={`panel flex max-h-[88dvh] w-full ${sizes[size]} flex-col overflow-hidden`}>
        <header className="flex items-start gap-4 border-b border-white/10 p-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold">{title}</h2>
            {description ? <p className="mt-1 text-sm text-zinc-300">{description}</p> : null}
          </div>
          <button type="button" className="no-drag rounded-md p-2 text-zinc-300 hover:bg-white/10 hover:text-white" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-5">{children}</div>
        {footer ? <footer className="grid grid-cols-2 gap-3 border-t border-white/10 p-5">{footer}</footer> : null}
      </section>
    </div>
  );
}
