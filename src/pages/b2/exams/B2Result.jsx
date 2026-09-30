import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronRight } from "lucide-react";
import B2MayaPortrait from "../../../components/b2/B2MayaPortrait";
import {
  B2Page,
  B2Button,
  B2ScoreRing,
  B2ScoreBars,
  B2ScoreStatus,
  B2ScoreGuide,
  B2State,
} from "../../../components/b2/B2UI";
import useB2Access from "../../../hooks/useB2Access";
import { getB2ScoreBand } from "../../../utils/b2Scores";
import {
  startB2ExamSubmission,
  getB2ExamSubmissionStatus,
  getB2TestOverview,
} from "../../../api/b2Api";
import { hapticHeavy, hapticLight } from "../../../utils/haptics";

const SKILL_ORDER = ["reading", "listening", "speaking", "writing"];
const SKILL_LABELS = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
};

function formatSkillList(items) {
  if (!items?.length) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// Same banding as the backend's buildB2TestSummary so this screen reads the
// same as the test hub.
function buildSummary(bySkill) {
  const groups = { needsPractice: [], developing: [], good: [] };
  for (const skill of SKILL_ORDER) {
    const entry = bySkill[skill];
    if (!entry?.measured) continue;
    const band = getB2ScoreBand(entry.score).key;
    if (band === "practice") groups.needsPractice.push(SKILL_LABELS[skill]);
    else if (band === "developing") groups.developing.push(SKILL_LABELS[skill]);
    else if (band === "good") groups.good.push(SKILL_LABELS[skill]);
  }
  const parts = [];
  if (groups.needsPractice.length) {
    parts.push(
      `${formatSkillList(groups.needsPractice)} ${groups.needsPractice.length === 1 ? "needs" : "need"} more practice.`,
    );
  }
  if (groups.developing.length) {
    parts.push(
      `${formatSkillList(groups.developing)} ${groups.developing.length === 1 ? "is" : "are"} coming along.`,
    );
  }
  if (groups.good.length) {
    parts.push(
      `${formatSkillList(groups.good)} ${groups.good.length === 1 ? "looks" : "look"} good.`,
    );
  }
  return parts.join(" ") || null;
}

export default function B2Result() {
  const navigate = useNavigate();
  const open = useB2Access();
  const { paperId } = useParams();
  const { user } = useSelector((state) => state.auth);

  const [submissionData, setSubmissionData] = useState(null);
  const [sections, setSections] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const fetchFinalReport = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    // Overview powers the "Test N" number and the "Start here" suggestion —
    // non-blocking: the result card still renders if it fails.
    const overviewPromise = getB2TestOverview()
      .then((res) => setOverview(res.data))
      .catch((err) => console.error("Failed to load test overview:", err));
    try {
      // Call startB2ExamSubmission to get or verify the session.
      // For a completed exam the backend returns 403 with alreadyCompleted + submissionId.
      // In both paths we then call getB2ExamSubmissionStatus which returns the same
      // { submission, sections } shape including exam_type — avoids the data-shape mismatch.
      const startRes = await startB2ExamSubmission(paperId);
      const subId = startRes.data.id;

      // Fetch the full status (includes exam_type via JOIN)
      const statusRes = await getB2ExamSubmissionStatus(subId);
      setSubmissionData(statusRes.data.submission);
      setSections(
        Array.isArray(statusRes.data.sections) ? statusRes.data.sections : [],
      );
    } catch (err) {
      // F-H5: Backend returns 403 with alreadyCompleted + submissionId for completed papers
      if (
        err?.response?.status === 403 &&
        err?.response?.data?.alreadyCompleted
      ) {
        try {
          const subId = err.response.data.submissionId;
          const statusRes = await getB2ExamSubmissionStatus(subId);
          // Same shape as happy path — consistent
          setSubmissionData(statusRes.data.submission);
          setSections(
            Array.isArray(statusRes.data.sections)
              ? statusRes.data.sections
              : [],
          );
          await overviewPromise;
          return;
        } catch (innerErr) {
          console.error("Error fetching completed exam status:", innerErr);
        }
      }
      console.error("Error fetching final report details:", err);
      setFetchError(true);
    } finally {
      await overviewPromise;
      setLoading(false);
    }
  }, [paperId]);

  useEffect(() => {
    if (submissionData && !loading) {
      hapticHeavy();
    }
  }, [submissionData, loading]);

  useEffect(() => {
    if (!user?.user_id) return;
    fetchFinalReport();
  }, [user?.user_id, fetchFinalReport]);

  if (loading)
    return (
      <B2Page title="Assessment results" back="/b2/test">
        <B2State loading />
      </B2Page>
    );

  if (fetchError || !submissionData)
    return (
      <B2Page title="Assessment results" back="/b2/test">
        <B2State
          title="Your results couldn’t load"
          onRetry={fetchFinalReport}
        />
      </B2Page>
    );

  // Per-skill measured scores — a section only counts once completed with a
  // finite score, otherwise it shows "Not scored yet".
  const bySkill = {};
  for (const skill of SKILL_ORDER) {
    const sec = sections.find(
      (s) => s.section_type === skill && s.status === "completed",
    );
    const raw = parseFloat(sec?.score);
    bySkill[skill] =
      sec && isFinite(raw)
        ? { measured: true, score: Math.round(raw) }
        : { measured: false, score: null };
  }

  const overallRaw = parseFloat(submissionData.overall_score);
  const overallScore = isFinite(overallRaw) ? Math.round(overallRaw) : null;
  const summary = buildSummary(bySkill);

  // "Test N" — this submission's position in the completed-test history.
  const historyEntry = overview?.history?.find(
    (h) => h.submissionId === submissionData.id,
  );
  const testNumber = historyEntry?.testNumber ?? overview?.completed ?? null;

  const suggested = overview?.suggested || null;

  const openSuggested = () => {
    if (!suggested) return;
    hapticLight();
    open(suggested.module, `/b2/${suggested.module}/${suggested.exerciseId}`);
  };

  const measuredCount = SKILL_ORDER.filter(
    (skill) => bySkill[skill].measured,
  ).length;
  const allComplete =
    sections.length > 0 &&
    SKILL_ORDER.every(
      (skill) =>
        sections.find((s) => s.section_type === skill)?.status === "completed",
    );
  return (
    <B2Page title="Assessment results" back="/b2/test">
      <div className="b2-content b2-results-content b2-with-primary">
        <div className="b2-feedback-hero">
          <B2MayaPortrait user={user} />
          <span className="b2-eyebrow">
            {testNumber ? `Assessment ${testNumber}` : "Your assessment"}
          </span>
          <h1>{allComplete ? "Test complete" : "Your results so far"}</h1>
        </div>
        <section className="b2-panel">
          <div className="b2-scoreline">
            <B2ScoreRing score={overallScore} />
            <div>
              <h2>{measuredCount < 4 ? "Score so far" : "Overall score"}</h2>
              {overallScore !== null && <B2ScoreStatus score={overallScore} />}
              <p className="b2-small">{measuredCount} of 4 skills scored</p>
            </div>
          </div>
          <B2ScoreBars bySkill={bySkill} />
          {summary && <p className="b2-small b2-feedback-copy">{summary}</p>}
          {measuredCount < 4 && (
            <p className="b2-small b2-feedback-copy">
              {allComplete
                ? "More scores will appear when ready."
                : "Finish all sections to complete your results."}
            </p>
          )}
          <B2ScoreGuide />
        </section>
        {allComplete && suggested && (
          <section className="b2-next-practice">
            <span className="b2-eyebrow">
              Up next · {" "}
              {suggested.skillLabel?.toLowerCase() || suggested.module}
            </span>
            <h2>{suggested.title}</h2>
            {suggested.durationMinutes > 0 && (
              <p className="b2-small">{suggested.durationMinutes} min</p>
            )}
          </section>
        )}
        <div className="b2-fixed-primary">
          <B2Button
            onClick={
              !allComplete
                ? () => navigate(`/b2/exams/papers/${paperId}/dashboard`)
                : suggested
                  ? openSuggested
                  : () => navigate("/")
            }
          >
            {!allComplete
              ? "Continue assessment"
              : suggested
                ? `Practise ${suggested.skillLabel?.toLowerCase() || suggested.module}`
                : "Choose a skill"}
            <ChevronRight size={18} />
          </B2Button>
        </div>
      </div>
    </B2Page>
  );
}
