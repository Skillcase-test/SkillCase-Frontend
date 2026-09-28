import { B2ScoreBar } from "../../../components/b2/B2UI";

export default function MetricBar({ label, score }) {
  return <div className="b2-detail-metric"><B2ScoreBar label={label} score={score} /></div>;
}
