interface ProgressRingProps {
  value: number; size?: number; stroke?: number;
  color?: string; label?: React.ReactNode; trackColor?: string;
}

export function ProgressRing({ value, size = 64, stroke = 6, color = "#5B8CFF", label, trackColor = "rgba(255,255,255,0.07)" }: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(.2,.8,.2,1)", filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="ring-center" style={{ fontSize: size * 0.26 }}>
        {label !== undefined ? label : `${value}%`}
      </div>
    </div>
  );
}

interface MultiRingProps { rings: { value: number; color: string; track?: string }[]; size?: number; }

export function MultiRing({ rings, size = 130 }: MultiRingProps) {
  const stroke = 10;
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {rings.map((ring, i) => {
          const radius = (size - stroke) / 2 - i * (stroke + 3);
          const c = 2 * Math.PI * radius;
          const off = c - (ring.value / 100) * c;
          return (
            <g key={i}>
              <circle cx={size / 2} cy={size / 2} r={radius} stroke={ring.track || "rgba(255,255,255,0.06)"} strokeWidth={stroke} fill="none" />
              <circle cx={size / 2} cy={size / 2} r={radius}
                stroke={ring.color} strokeWidth={stroke} fill="none"
                strokeDasharray={c} strokeDashoffset={off}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 4px ${ring.color})` }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
