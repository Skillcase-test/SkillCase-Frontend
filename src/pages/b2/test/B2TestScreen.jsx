import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowRight, Clock3, ChevronRight, TrendingUp, ChartNoAxesCombined } from "lucide-react";
import { getB2TestOverview } from "../../../api/b2Api";
import useB2Access from "../../../hooks/useB2Access";
import B2MayaPortrait from "../../../components/b2/B2MayaPortrait";
import {
  B2Page,
  B2Button,
  B2ScoreRing,
  B2ScoreBars,
  B2ScoreStatus,
  B2ScoreGuide,
  B2SkillStrip,
  B2State,
} from "../../../components/b2/B2UI";
export default function B2TestScreen() {
  const navigate = useNavigate(),
    open = useB2Access();
  const { user } = useSelector((s) => s.auth);
  const [overview, setOverview] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setOverview((await getB2TestOverview()).data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const latest = overview?.latest,
    next = overview?.nextPaper,
    suggested = overview?.suggested,
    previous = (overview?.history || [])
      .filter((h) => h.submissionId !== latest?.submissionId)
      .slice()
      .reverse();
  const firstTest = !latest && !(overview?.completed > 0) && next && !next.inProgress;
  return (
    <B2Page title="Your progress" className="b2-test-hub">
      {loading ? (
        <B2State loading />
      ) : error ? (
        <B2State onRetry={load} />
      ) : (
        <div className="b2-content">
          <div className="b2-test-intro">
            <h1>{firstTest ? "Find your starting point" : "Your progress"}</h1>
            {firstTest && <p>Discover what to practise next.</p>}
          </div>
          {latest && (
            <section className="b2-panel">
              <div className="b2-scoreline">
                <B2ScoreRing score={latest.overallScore} />
                <div>
                  <span className="b2-eyebrow">Latest assessment</span>
                  <h2>Test {latest.testNumber}</h2>
                  <B2ScoreStatus score={latest.overallScore} />
                  <p className="b2-small">
                    {latest.finishedAt
                      ? new Date(latest.finishedAt).toLocaleDateString(
                          undefined,
                          { day: "numeric", month: "short", year: "numeric" },
                        )
                      : "Your latest result"}
                  </p>
                </div>
              </div>
              <B2ScoreBars bySkill={latest.bySkill} />
              <B2ScoreGuide />
              {latest.summary && (
                <p className="b2-feedback-copy b2-small">{latest.summary}</p>
              )}
              {latest.paperId && (
                <B2Button
                  variant="quiet"
                  onClick={() =>
                    navigate(
                      `/b2/exams/papers/${latest.paperId}/congratulations`,
                    )
                  }
                >
                  View results <ArrowRight size={17} />
                </B2Button>
              )}
            </section>
          )}
          {suggested && !next?.inProgress && (
            <section className="b2-stack">
              <div>
                <h2>Recommended practice</h2>
                <p className="b2-small">
                  {suggested.skillLabel}: {suggested.title}
                </p>
              </div>
              <B2Button
                onClick={() =>
                  open(
                    suggested.module,
                    `/b2/${suggested.module}/${suggested.exerciseId}`,
                  )
                }
              >
                Start practice <ArrowRight size={18} />
              </B2Button>
            </section>
          )}
          {next ? (
            <section className="b2-assessment-card" aria-labelledby="b2-next-assessment-title">
              <div className="b2-assessment-card-header">
                <div className="b2-row b2-between">
                  <span className="b2-eyebrow">
                    {next.inProgress ? "In progress" : firstTest ? "First assessment" : "Next assessment"}
                  </span>
                  <span className="b2-chip">
                    {(overview.completed ?? 0) + 1}
                    {overview.total ? ` of ${overview.total}` : ""}
                  </span>
                </div>
                <div className={`b2-assessment-card-heading${firstTest ? " b2-assessment-card-heading--first" : ""}`}>
                  <div>
                    <h2 id="b2-next-assessment-title">
                      {next.inProgress
                        ? "Continue your test"
                        : next.title || "Check your progress"}
                    </h2>
                    {next.durationMinutes > 0 && (
                      <span className="b2-assessment-duration">
                        <Clock3 size={15} aria-hidden="true" />
                        {next.inProgress ? `${next.durationMinutes} min total` : `About ${next.durationMinutes} min`}
                        {!firstTest && " · 4 skills"}
                      </span>
                    )}
                  </div>
                  {firstTest && <B2MayaPortrait pose="wave" user={user} />}
                </div>
              </div>
              <div className="b2-assessment-card-body">
                {firstTest && <B2SkillStrip />}
                {next.inProgress && (
                  <p className="b2-small">Started section timers keep running.</p>
                )}
                <B2Button
                  variant={latest && !next.inProgress ? "secondary" : "primary"}
                  onClick={() => open("exams", "/b2/test/ready")}
                >
                  {next.inProgress ? "Resume test" : "Prepare for test"}
                  <ArrowRight size={18} />
                </B2Button>
              </div>
            </section>
          ) : (
            <div className="b2-note">
              <strong>All assessments complete.</strong>
              <B2Button variant="quiet" onClick={() => navigate("/")}>
                Choose a skill
              </B2Button>
            </div>
          )}
          {firstTest && (
            <div className="b2-test-progress-note">
              <span className="b2-icon"><ChartNoAxesCombined size={22} aria-hidden="true" /></span>
              <div>
                <h2>Your progress starts here</h2>
                <p>See your scores after your first test.</p>
              </div>
            </div>
          )}
          {previous.length > 0 && (
            <section>
              <h2>Earlier assessments</h2>
              {previous.map((h) => (
                <div key={h.submissionId} className="b2-row b2-history">
                  <TrendingUp size={20} />
                  <div className="b2-grow">
                    <strong>Test {h.testNumber}</strong>
                    <p className="b2-small">
                      {h.finishedAt
                        ? new Date(h.finishedAt).toLocaleDateString()
                        : ""}
                    </p>
                  </div>
                  <strong>
                    {h.overallScore == null
                      ? "Not scored"
                      : `${Math.round(h.overallScore)}%`}
                  </strong>
                  {h.paperId && (
                    <button
                      className="b2-back"
                      aria-label={`View test ${h.testNumber} results`}
                      onClick={() =>
                        navigate(
                          `/b2/exams/papers/${h.paperId}/congratulations`,
                        )
                      }
                    >
                      <ChevronRight size={20} />
                    </button>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </B2Page>
  );
}
