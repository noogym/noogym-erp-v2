import { MoreVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";

export interface DropdownAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

export function DropdownMenu({ label = "Mais ações", actions }: { label?: string; actions: DropdownAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Button onClick={() => setOpen((value) => !value)} icon={<MoreVertical className="h-4 w-4" />}>{label}</Button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-lg border border-white/10 bg-[#071014] p-1 shadow-soft">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={`block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-white/[0.06] ${action.danger ? "text-red-300" : "text-zinc-200"}`}
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
