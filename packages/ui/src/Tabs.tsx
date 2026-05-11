export function Tabs({
  tabs,
  active,
  onChange
}: {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div className="flex min-h-12 items-end gap-7 overflow-x-auto border-b border-white/10">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`no-drag h-12 shrink-0 whitespace-nowrap border-b-2 px-1 text-sm transition ${
            active === tab ? "border-noogym-lime text-noogym-lime" : "border-transparent text-zinc-200 hover:text-white"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
