import type { TextareaHTMLAttributes } from "react";

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  requiredMark?: boolean;
}

export function FormTextarea({ label, requiredMark, className = "", ...props }: FormTextareaProps) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-2 block text-zinc-200">{label}{requiredMark ? <span className="text-red-400"> *</span> : null}</span>
      <textarea
        className="min-h-20 w-full resize-none rounded-md border border-white/10 bg-black/20 p-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-noogym-lime/70"
        maxLength={props.maxLength ?? 200}
        {...props}
      />
    </label>
  );
}
