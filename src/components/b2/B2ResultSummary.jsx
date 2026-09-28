import { trackB2Action } from "../../utils/b2Telemetry";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowRight } from "lucide-react";
import { getB2Exercises } from "../../api/b2Api";
import B2MayaPortrait from "./B2MayaPortrait";
import useB2Access from "../../hooks/useB2Access";
import { B2Button, B2ScoreRing, B2ScoreStatus, B2ScoreBar, B2ScoreGuide } from "./B2UI";
import { normalizeB2Score } from "../../utils/b2Scores";
export default function B2ResultSummary({
  skill,
  assessment = false,
  data,
  exerciseId,
  onReview,
  onContinue,
}) {
  const navigate = useNavigate(),
    open = useB2Access(),
    { user } = useSelector((s) => s.auth);
  const [finding, setFinding] = useState(false),
    [error, setError] = useState("");
  const objective = ["reading", "listening"].includes(skill),
    label = skill.charAt(0).toUpperCase() + skill.slice(1),
    scored = normalizeB2Score(data.score) !== null;
  const incorrect = Number(data.incorrect_count) || 0,
    skipped = Number(data.skipped_count) || 0;
  const nextIsPrimary = !assessment && objective &&
    normalizeB2Score(data.score) === 100 && incorrect === 0 && skipped === 0;
  const feedback = data.feedback || {};
  const details = feedback.whatWentWell
    ? feedback
    : Object.values(feedback).find(
        (f) => f && typeof f === "object" && f.whatWentWell,
      ) || {};
  const reports = feedback.metrics
    ? [feedback]
    : Object.values(feedback).filter(
        (f) => f && typeof f === "object" && f.metrics,
      );
  const metricLabels = {
    grammar: "Grammar",
    vocabulary: "Vocabulary",
    sentence_structure: "Sentence structure",
    spellings: "Spelling",
    pronunciation: "Pronunciation",
    fluency: "Fluency",
    accuracy: "Accuracy",
    completeness: "Completeness",
  };
  const metrics = Object.keys(metricLabels)
    .map((key) => {
      const values = reports
        .map((r) => r.metrics?.[key])
        .map(normalizeB2Score)
        .filter((v) => v !== null);
      return {
        key,
        value: values.length
          ? Math.round(
              values.reduce((sum, v) => sum + Number(v), 0) / values.length,
            )
          : null,
      };
    })
    .filter((m) => m.value !== null);
  const next = async () => {
    if (finding) return;
    setFinding(true);
    setError("");
    try {
      const res = await getB2Exercises(skill);
      const list = Array.isArray(res.data) ? res.data : [];
      const item = list.find(
        (e) => String(e.id) !== String(exerciseId) && e.status !== "completed",
      );
      if (item) open(skill, `/b2/${skill}/${item.id}`);
      else navigate(`/b2/${skill}`);
    } catch {
      setError("The next exercise couldn’t load. Please try again.");
    } finally {
      setFinding(false);
    }
  };
  const review = () => {
    trackB2Action("answers_reviewed", {
      skill, mode: assessment ? "assessment" : "practice", entityId: exerciseId,
    });
    onReview();
  };
  return (
    <div className="b2-content b2-results-content b2-with-primary" style={error ? { paddingBottom: 190 } : undefined}>
      <div className="b2-feedback-hero">
        <B2MayaPortrait user={user} />
        <span className="b2-eyebrow">
          {assessment ? "Assessment" : "Practice"}
        </span>
        <h1>{scored ? `${label} complete` : "Answers submitted"}</h1>
      </div>
      <section className="b2-panel">
        <div className="b2-scoreline">
          <B2ScoreRing score={scored ? data.score : null} />
          <div>
            <h2>{scored ? "Your score" : "Awaiting feedback"}</h2>
            {scored && <B2ScoreStatus score={data.score} />}
            {!scored && <p className="b2-small">Check back for your score.</p>}
          </div>
        </div>
        {objective && scored && (
          <div className="b2-stat-grid">
            <div className="b2-stat-correct">
              <strong>{data.correct_count ?? "—"}</strong>
              <span>Correct</span>
            </div>
            <div className="b2-stat-review">
              <strong>{data.incorrect_count ?? "—"}</strong>
              <span>To review</span>
            </div>
            <div>
              <strong>{data.skipped_count ?? "—"}</strong>
              <span>Skipped</span>
            </div>
          </div>
        )}
        {!objective && metrics.length > 0 && (
          <div className="b2-score-bars">
            {metrics.map((m) => (
              <B2ScoreBar key={m.key} label={metricLabels[m.key]} score={m.value} />
            ))}
          </div>
        )}
        <div className="b2-feedback-copy">
          <h3>{objective ? "Answer review" : "Next focus"}</h3>
          <p className="b2-small">
            {objective
              ? incorrect + skipped > 0
                ? `Review ${incorrect + skipped} incorrect or skipped ${incorrect + skipped === 1 ? "answer" : "answers"}.`
                : "Review your answers and explanations."
              : details.tryToImprove || "Review your response for feedback."}
          </p>
          {details.whatWentWell && (
            <p className="b2-small" style={{ marginTop: 10 }}>
              <strong>What went well: </strong>
              {details.whatWentWell}
            </p>
          )}
          {assessment && <B2Button variant="quiet" className="b2-context-review" onClick={review}>
            Review this section <ArrowRight size={16} aria-hidden="true" />
          </B2Button>}
        </div>
        <B2ScoreGuide />
      </section>
      <div className="b2-fixed-primary">
        {error && <p role="alert" className="b2-action-error">{error}</p>}
        <div className={assessment ? undefined : "b2-result-actions"}>
          {!assessment && <B2Button variant="secondary" onClick={nextIsPrimary ? review : next} disabled={!nextIsPrimary && finding}>
            {nextIsPrimary ? "Review answers" : finding ? "Loading…" : "Next exercise"}
          </B2Button>}
          <B2Button onClick={assessment ? () => {
            trackB2Action("assessment_continued", { skill, mode: "assessment", entityId: exerciseId });
            onContinue();
          } : nextIsPrimary ? next : review} disabled={nextIsPrimary && finding}>
            {assessment ? "Continue assessment" : nextIsPrimary ? finding ? "Loading…" : "Next exercise" : "Review answers"}
            {assessment && <ArrowRight size={18} aria-hidden="true" />}
          </B2Button>
        </div>
      </div>
    </div>
  );
}
