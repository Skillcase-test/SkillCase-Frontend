import StampGlyph from "./StampGlyph";

// Longer titles overflow the fixed 200x200 viewBox at the default size —
// scale font size/letter-spacing down by title length so everything up to the
// longest current title (30 chars) stays on the circle.
function titleFit(len) {
  if (len <= 11) return { size: 15, spacing: 1.4 };
  if (len <= 15) return { size: 12, spacing: 0.8 };
  if (len <= 20) return { size: 10, spacing: 0.45 };
  return { size: 8.5, spacing: 0.2 };
}

const INK = "#17336d"; // Skillcase navy stands in for the reference --accent.

export default function StampSVG({ topic = {}, animated = true }) {
  const d = new Date()
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
  const title = (topic?.title || "DEUTSCH").toUpperCase();
  const topicId = topic?.id || "default";
  const { size: titleSize, spacing: titleSpacing } = titleFit(title.length);
  return (
    <svg
      viewBox="0 0 200 200"
      style={animated ? { animation: "lg2-stamp-in .45s cubic-bezier(.2,1.4,.4,1) both" } : { opacity: 1 }}
    >
      <defs>
        <path id={`arc-${topicId}`} d="M100,100 m-72,0 a72,72 0 1,1 144,0" fill="none" />
        <path id={`arc2-${topicId}`} d="M100,100 m72,0 a72,72 0 1,1 -144,0" fill="none" />
      </defs>
      <circle cx="100" cy="100" r="86" fill="none" stroke={INK} strokeWidth="5" />
      <circle cx="100" cy="100" r="76" fill="none" stroke={INK} strokeWidth="1.6" strokeDasharray="4 4" />
      <text fontSize="15" fontWeight="800" letterSpacing="3.4" fill={INK}>
        <textPath href={`#arc-${topicId}`} startOffset="50%" textAnchor="middle">BUNDESREPUBLIK DEUTSCHLAND</textPath>
      </text>
      <text fontSize="12" fontWeight="700" letterSpacing="3" fill={INK}>
        <textPath href={`#arc2-${topicId}`} startOffset="50%" textAnchor="middle">{d}</textPath>
      </text>
      <g color={INK}><StampGlyph topic={topic} x={100} y={70} size={40} /></g>
      <text x="100" y="122" textAnchor="middle" fontSize={titleSize} fontWeight="800"
        letterSpacing={titleSpacing} fill={INK}>{title}</text>
      <line x1="42" y1="133" x2="158" y2="133" stroke={INK} strokeWidth="1.5" />
      <text x="100" y="149" textAnchor="middle" fontSize="11" fill={INK}>EINGEREIST</text>
    </svg>
  );
}
