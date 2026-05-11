import type { InputHTMLAttributes } from "react";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  requiredMark?: boolean;
  hint?: string;
}

export function FormInput({ label, requiredMark, hint, className = "", ...props }: FormInputProps) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-2 block text-zinc-200">{label}{requiredMark ? <span className="text-red-400"> *</span> : null}</span>
      <input
        className="h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-noogym-lime/70"
        {...props}
      />
      {hint ? <span className="mt-1 block text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}
