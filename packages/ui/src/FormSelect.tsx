import type { SelectHTMLAttributes } from "react";

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  requiredMark?: boolean;
  options?: string[];
}

export function FormSelect({ label, requiredMark, options, children, className = "", ...props }: FormSelectProps) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-2 block text-zinc-200">{label}{requiredMark ? <span className="text-red-400"> *</span> : null}</span>
      <select className="h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 text-white outline-none focus:border-noogym-lime/70" {...props}>
        {options ? options.map((option) => <option key={option}>{option}</option>) : children}
      </select>
    </label>
  );
}
