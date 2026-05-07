type Tone = "lime" | "yellow" | "purple" | "blue" | "orange" | "red" | "gray" | "green";

const tones: Record<Tone, string> = {
  lime: "border-noogym-lime/60 bg-noogym-lime/10 text-noogym-lime",
  yellow: "border-yellow-400/60 bg-yellow-400/10 text-yellow-300",
  purple: "border-purple-400/60 bg-purple-400/10 text-purple-300",
  blue: "border-sky-400/60 bg-sky-400/10 text-sky-300",
  orange: "border-orange-400/60 bg-orange-400/10 text-orange-300",
  red: "border-red-400/60 bg-red-400/10 text-red-300",
  gray: "border-zinc-400/50 bg-zinc-400/10 text-zinc-300",
  green: "border-green-400/60 bg-green-400/10 text-green-300"
};

export function Badge({ children, tone = "lime" }: { children: string; tone?: Tone }) {
  return <span className={`inline-flex w-fit items-center rounded border px-2 py-0.5 text-xs ${tones[tone]}`}>{children}</span>;
}
