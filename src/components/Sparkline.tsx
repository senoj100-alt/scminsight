type Props = { values: number[]; width?: number; height?: number; color?: string; className?: string };

export function Sparkline({ values, width = 120, height = 36, color = "currentColor", className }: Props) {
  if (values.length < 2) return null;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const span = Math.max(1, max - min);
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => `${i * stepX},${height - ((v - min) / span) * height}`).join(" ");
  const last = values[values.length - 1];
  const lastY = height - ((last - min) / span) * height;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} style={{ color }}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={width} cy={lastY} r={2} fill="currentColor" />
    </svg>
  );
}