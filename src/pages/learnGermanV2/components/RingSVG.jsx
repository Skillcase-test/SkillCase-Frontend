// Segmented progress ring — one arc per sub, gold as each completes.
export default function RingSVG({ done, total, size, lit }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
  const segLen = c / total;
  const gap = total > 1 ? Math.min(6, segLen * 0.18) : 0;
  const dash = segLen - gap;
  const segs = [];
  for (let i = 0; i < total; i++) {
    const rot = -90 + i * (360 / total);
    segs.push(
      <circle key={i} cx={cx} cy={cy} r={r} fill="none"
        stroke={i < done ? "#EDB843" : "#E2E8F0"} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`} transform={`rotate(${rot} ${cx} ${cy})`}
        style={lit ? { transition: "stroke .3s" } : undefined} />
    );
  }
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{segs}</svg>;
}
