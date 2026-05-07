export function LineChart({ values, labels }: { values: number[]; labels?: string[] }) {
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 100;
    const y = 100 - (value / max) * 84 - 8;
    return `${x},${y}`;
  });
  const area = `0,100 ${points.join(" ")} 100,100`;

  return (
    <div className="h-full min-h-40">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        {[20, 40, 60, 80].map((y) => (
          <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgba(255,255,255,.07)" strokeWidth=".35" />
        ))}
        <polygon points={area} fill="rgba(182,255,0,.16)" />
        <polyline points={points.join(" ")} fill="none" stroke="#B6FF00" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
        {points.map((point) => {
          const [x, y] = point.split(",");
          return <circle key={point} cx={x} cy={y} r="1.6" fill="#B6FF00" />;
        })}
      </svg>
      {labels ? (
        <div className="mt-2 grid grid-flow-col text-center text-xs text-zinc-400">
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BarChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-56 items-end gap-6 px-6 pt-6">
      {values.map((value, index) => (
        <div key={labels[index]} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-xs text-zinc-200">{value}</span>
          <div
            className="w-full max-w-9 rounded-t bg-noogym-lime shadow-glow"
            style={{ height: `${Math.max(18, (value / max) * 150)}px` }}
          />
          <span className="text-xs text-zinc-400">{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({
  items,
  center
}: {
  items: Array<{ label: string; value: number; color: string }>;
  center?: string;
}) {
  let offset = 25;
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 42 42" className="-rotate-90">
          <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="rgba(255,255,255,.08)" strokeWidth="6" />
          {items.map((item) => {
            const dash = (item.value / total) * 100;
            const circle = (
              <circle
                key={item.label}
                cx="21"
                cy="21"
                r="15.9"
                fill="transparent"
                stroke={item.color}
                strokeWidth="6"
                strokeDasharray={`${dash} ${100 - dash}`}
                strokeDashoffset={offset}
              />
            );
            offset -= dash;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-semibold">{center ?? total}</span>
          <span className="text-xs text-zinc-400">Total</span>
        </div>
      </div>
      <div className="flex-1 space-y-3 text-sm">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-2 text-zinc-200">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
            <span className="text-zinc-100">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
