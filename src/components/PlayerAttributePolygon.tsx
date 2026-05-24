import React from "react";

export interface PolygonAxis {
  label: string;
  /** 0-100 */
  value: number;
}

interface Props {
  axes: PolygonAxis[];
  size?: number;
  /** Optional comparison axes drawn underneath in muted tone */
  compare?: PolygonAxis[];
  className?: string;
}

/**
 * Football Manager-style attribute polygon (radar).
 * Uses the project's Rise Gold primary token and renders as scalable SVG.
 */
export const PlayerAttributePolygon: React.FC<Props> = ({ axes, size = 240, compare, className }) => {
  const n = Math.max(3, axes.length);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 28;
  const rings = [0.25, 0.5, 0.75, 1];

  const pointAt = (i: number, v: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rr = (Math.max(0, Math.min(100, v)) / 100) * r;
    return { x: cx + Math.cos(angle) * rr, y: cy + Math.sin(angle) * rr };
  };

  const polyPath = (data: PolygonAxis[]) =>
    data.map((d, i) => {
      const { x, y } = pointAt(i, d.value);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ") + " Z";

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label="Player attribute polygon"
    >
      {/* Rings */}
      {rings.map(k => (
        <polygon
          key={k}
          points={Array.from({ length: n }, (_, i) => {
            const a = (Math.PI * 2 * i) / n - Math.PI / 2;
            return `${cx + Math.cos(a) * r * k},${cy + Math.sin(a) * r * k}`;
          }).join(" ")}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={k === 1 ? 1 : 0.5}
          opacity={k === 1 ? 0.8 : 0.4}
        />
      ))}
      {/* Spokes */}
      {axes.map((_, i) => {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={cx + Math.cos(a) * r}
            y2={cy + Math.sin(a) * r}
            stroke="hsl(var(--border))"
            strokeWidth={0.5}
            opacity={0.4}
          />
        );
      })}
      {/* Compare polygon */}
      {compare && compare.length === axes.length && (
        <path
          d={polyPath(compare)}
          fill="hsl(var(--muted-foreground) / 0.18)"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      )}
      {/* Main polygon */}
      <path
        d={polyPath(axes)}
        fill="hsl(var(--primary) / 0.25)"
        stroke="hsl(var(--primary))"
        strokeWidth={1.5}
        style={{ transition: "d 400ms ease" }}
      />
      {/* Vertices */}
      {axes.map((d, i) => {
        const p = pointAt(i, d.value);
        return <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="hsl(var(--primary))" />;
      })}
      {/* Labels */}
      {axes.map((d, i) => {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + Math.cos(a) * (r + 16);
        const ly = cy + Math.sin(a) * (r + 16);
        const anchor = Math.cos(a) > 0.3 ? "start" : Math.cos(a) < -0.3 ? "end" : "middle";
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            fontSize={10}
            textAnchor={anchor}
            dominantBaseline="middle"
            fill="hsl(var(--muted-foreground))"
            style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
};

export default PlayerAttributePolygon;