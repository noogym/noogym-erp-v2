const colors = ["#B6FF00", "#38BDF8", "#A855F7", "#F59E0B", "#2DD4BF", "#FB7185", "#94A3B8"];

export function ColorPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`h-8 w-8 rounded-full border-2 ${value === color ? "border-white ring-2 ring-noogym-lime" : "border-white/10"}`}
          style={{ backgroundColor: color }}
          aria-label={`Selecionar cor ${color}`}
        />
      ))}
    </div>
  );
}
