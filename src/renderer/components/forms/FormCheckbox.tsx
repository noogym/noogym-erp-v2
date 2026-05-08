import type { InputHTMLAttributes } from "react";

interface FormCheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
}

export function FormCheckbox({ label, description, className = "", ...props }: FormCheckboxProps) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm ${className}`}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-noogym-lime" {...props} />
      <span>
        <span className="block text-zinc-100">{label}</span>
        {description ? <span className="mt-1 block text-xs text-zinc-400">{description}</span> : null}
      </span>
    </label>
  );
}
