import { PenLine, Lightbulb } from "lucide-react";
import { B2ScoreRing } from "../../../components/b2/B2UI";
import { getScoreGreeting } from "../utils/scoreUtils";
import MetricBar from "./MetricBar";

export default function WritingFeedback({ score, metrics = {}, nextFocus }) {
  const tip = typeof nextFocus === "string" ? nextFocus.trim() : "";
  return (
    <section className="b2-writing-feedback" aria-label="Writing feedback">
      <header className="b2-writing-feedback-header">
        <div className="b2-writing-feedback-heading">
          <span className="b2-writing-feedback-label"><PenLine size={15} aria-hidden="true" /> Writing feedback</span>
          <h2>{getScoreGreeting(score)}</h2>
          <p>Overall writing score</p>
        </div>
        <div className="b2-detail-score">
          <B2ScoreRing score={score} size={92} />
        </div>
      </header>
      <div className="b2-writing-feedback-metrics">
        <MetricBar label="Grammar" score={metrics.grammar} />
        <MetricBar label="Vocabulary" score={metrics.vocabulary} />
        <MetricBar label="Sentence structure" score={metrics.sentence_structure} />
        <MetricBar label="Spelling" score={metrics.spellings} />
      </div>
      {tip && <div className="b2-writing-feedback-tip">
        <Lightbulb size={19} aria-hidden="true" />
        <div><h3>Next focus</h3><p>{tip}</p></div>
      </div>}
    </section>
  );
}
