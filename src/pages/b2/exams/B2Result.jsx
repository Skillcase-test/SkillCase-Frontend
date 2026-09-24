import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronRight, Loader2, AlertCircle } from "lucide-react";
import mayaSmiling from "../../../assets/onboarding/mayaSmilingPhysio.webp";
import {
  startB2ExamSubmission,
  getB2ExamSubmissionStatus,
  getB2TestOverview,
} from "../../../api/b2Api";
import { hapticHeavy, hapticLight } from "../../../utils/haptics";

const SKILL_ORDER = ["reading", "listening", "writing", "speaking"];
const SKILL_LABELS = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
};

const RING_CIRC = 2 * Math.PI * 42; // ~264

// Decorative confetti pieces floating in the hero (positions from design).
const CONFETTI = [
  "top-[34px] left-[42px] w-2.5 h-2.5 rounded-sm bg-[#EDB843] rotate-[20deg]",
  "top-[72px] left-[86px] w-2 h-2 rounded-full bg-[#083262]",
  "top-[26px] right-[64px] w-3 h-1.5 rounded-sm bg-[#2E90FA] -rotate-[30deg]",
  "top-[88px] right-[38px] w-[9px] h-[9px] rounded-sm bg-[#EDB843] rotate-45",
  "top-[118px] left-[30px] w-[7px] h-[7px] rounded-full bg-[#2E90FA]",
];

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
    if (entry.score < 42) groups.needsPractice.push(SKILL_LABELS[skill]);
    else if (entry.score < 62) groups.developing.push(SKILL_LABELS[skill]);
    else groups.good.push(SKILL_LABELS[skill]);
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

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen flex items-center justify-center bg-white shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  if (fetchError || !submissionData) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col items-center justify-center gap-3 bg-white px-6">
        <AlertCircle className="w-6 h-6 text-red-500" />
        <p className="text-slate-500 text-xs font-semibold text-center">
          Failed to load final report.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-sky-950 text-white rounded-lg text-xs font-semibold border-0 outline-none cursor-pointer"
        >
          Go to home
        </button>
      </div>
    );
  }

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
  const overallScore = isFinite(overallRaw) ? Math.round(overallRaw) : 0;
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
    navigate(`/b2/${suggested.module}/${suggested.exerciseId}`);
  };

  return (
    <div className="w-full max-w-md lg:max-w-none mx-auto min-h-screen bg-gradient-to-b from-[#CFE3FF] to-[#E4EFFF] flex flex-col overflow-hidden">
      {/* Hero: confetti + cheering Maya */}
      <div className="relative shrink-0 h-[200px] flex items-end justify-center px-4">
        {CONFETTI.map((cls, i) => (
          <span key={i} className={`absolute ${cls}`} />
        ))}
        <img
          src={mayaSmiling}
          alt="Maya cheering"
          className="w-[150px] h-[180px] object-contain object-bottom select-none pointer-events-none"
        />
      </div>

      {/* Result sheet */}
      <div className="flex-1 bg-white rounded-t-3xl px-4 pt-[22px] pb-6 flex flex-col justify-between">
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1 items-center text-center">
            <span className="text-xs font-semibold tracking-[0.08em] uppercase text-[#067647]">
              {testNumber ? `Test ${testNumber} complete` : "Test complete"}
            </span>
            <h1 className="font-semibold text-2xl leading-tight text-[#083262]">
              Well done! Here is your result.
            </h1>
          </div>

          <div className="border border-[#E9EAEB] rounded-xl p-3.5 flex flex-col gap-3">
            <div className="flex items-center gap-3.5">
              <div className="relative w-16 h-16 shrink-0">
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 96 96"
                  className="-rotate-90"
                >
                  <circle
                    cx="48"
                    cy="48"
                    r="42"
                    fill="none"
                    stroke="#E9EAEB"
                    strokeWidth="10"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="42"
                    fill="none"
                    stroke="#B54708"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRC}
                    strokeDashoffset={RING_CIRC * (1 - overallScore / 100)}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-bold text-[17px] text-[#181D27]">
                  {overallScore}%
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-[15px]">
                  Your starting point
                </span>
                <span className="text-[13px] leading-snug text-[#535862]">
                  Take more tests to see your progress.
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {SKILL_ORDER.map((skill) => {
                const entry = bySkill[skill];
                const good = entry.measured && entry.score >= 60;
                return (
                  <div key={skill} className="flex flex-col gap-1">
                    <div className="flex justify-between text-[13px]">
                      <span className="font-medium">
                        {SKILL_LABELS[skill]}
                      </span>
                      {entry.measured ? (
                        <span
                          className={`font-semibold ${good ? "text-[#067647]" : "text-[#B42318]"}`}
                        >
                          {entry.score}%
                        </span>
                      ) : (
                        <span className="text-[#717680]">Not scored yet</span>
                      )}
                    </div>
                    <div className="h-2 rounded-full bg-[#F0F1F3]">
                      {entry.measured && (
                        <div
                          className={`h-2 rounded-full ${good ? "bg-[#17B26A]" : "bg-[#F04438]"}`}
                          style={{ width: `${entry.score}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {summary && (
              <p className="text-sm leading-snug text-[#414651]">{summary}</p>
            )}
          </div>

          {suggested && (
            <button
              type="button"
              onClick={openSuggested}
              className="w-full flex items-center gap-3 border border-[#C7DBF7] bg-[#F4F8FF] rounded-xl px-3.5 py-3 text-left cursor-pointer hover:bg-[#e9f1fe] active:scale-[0.99] transition-all"
            >
              <span className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-xs font-semibold text-[#717680] uppercase tracking-[0.06em]">
                  Start here
                </span>
                <span className="font-semibold text-[15px] text-[#181D27] truncate">
                  {suggested.skillLabel}: {suggested.title}
                </span>
                <span className="text-[13px] text-[#535862]">
                  About {suggested.durationMinutes} minutes
                </span>
              </span>
              <ChevronRight className="w-5 h-5 text-[#083262] shrink-0" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="w-full h-12 rounded-lg bg-[#EDB843] text-[#083262] text-base font-semibold hover:bg-[#e0aa2f] active:scale-[0.98] transition-all mt-6"
        >
          Go to home
        </button>
      </div>
    </div>
  );
}
