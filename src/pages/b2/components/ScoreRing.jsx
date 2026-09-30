import { B2ScoreRing, B2ScoreStatus } from "../../../components/b2/B2UI";

export default function ScoreRing({ score, label, circleSize = 144 }) {
  return (
    <div className="b2-detail-score">
      <B2ScoreRing score={score} size={circleSize} />
      <B2ScoreStatus score={score} />
      {label && <span>{label}</span>}
    </div>
  );
}
