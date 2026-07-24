/* Minimal dependency-free sparkline for the burn-rate chart. Token-coloured.
   Swap for a richer chart lib later if the design calls for it. */

import type { SeriesPoint } from "@/lib/types";

export function Sparkline({
  data,
  height = 64,
}: {
  data: SeriesPoint[];
  height?: number;
}) {
  if (data.length === 0) return null;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 100; // viewBox width units
  const denom = Math.max(1, data.length - 1);
  const points = data
    .map((d, i) => {
      const x = (i / denom) * w;
      const y = height - ((d.value - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      role="img"
      aria-label="Burn-rate trend"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
