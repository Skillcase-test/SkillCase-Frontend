import { ChevronRight } from "lucide-react";
import { getB2ScoreBand, normalizeB2Score } from "../../utils/b2Scores";

export default function B2ResponseReviewCard({ index, title, score, skipped, onClick }) {
  const value = skipped ? null : normalizeB2Score(score);
  const band = getB2ScoreBand(value);
  return (
    <button type="button" className="b2-response-card" onClick={onClick}
      style={{ background: band.background }} data-score-band={band.key}>
      <span className="b2-response-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
      <span className="b2-grow">
        <strong>{title}</strong>
        <small style={{ color: band.color }}>
          {skipped ? "Skipped" : value === null ? band.label : `${value}% · ${band.label}`}
        </small>
      </span>
      <ChevronRight size={19} aria-hidden="true" />
    </button>
  );
}
