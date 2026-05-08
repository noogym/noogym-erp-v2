interface FormSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function FormSwitch({ label, description, checked, onChange }: FormSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm">
      <span>
        <span className="block text-zinc-100">{label}</span>
        {description ? <span className="mt-1 block text-xs text-zinc-400">{description}</span> : null}
      </span>
      <button type="button" onClick={() => onChange(!checked)} className={`relative h-6 w-12 rounded-full transition ${checked ? "bg-noogym-lime" : "bg-zinc-700"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}
