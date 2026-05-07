export function StatusDot({ label, tone = "lime" }: { label: string; tone?: "lime" | "red" | "blue" | "gray" | "orange" }) {
  const color = {
    lime: "bg-noogym-lime text-noogym-lime",
    red: "bg-red-500 text-red-400",
    blue: "bg-sky-400 text-sky-300",
    gray: "bg-zinc-500 text-zinc-400",
    orange: "bg-orange-400 text-orange-300"
  }[tone];
  return (
    <span className={`inline-flex items-center gap-2 text-sm ${color.split(" ")[1]}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${color.split(" ")[0]}`} />
      {label}
    </span>
  );
}
