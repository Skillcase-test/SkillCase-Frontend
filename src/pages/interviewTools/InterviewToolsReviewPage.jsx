import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, Save, VideoOff } from "lucide-react";
import { interviewToolsApi } from "../../api/interviewToolsApi";
import InterviewVideoPlayer from "./shared/InterviewVideoPlayer";

const REVIEW_STATUSES = ["completed", "in_review", "shortlisted", "rejected"];
// Reviewer-facing labels — "completed" resolves to pass/fail from the score
// server-side, so the dropdown says what it actually does rather than naming
// the raw stored status.
const REVIEW_STATUS_LABELS = {
  completed: "Reviewed (score decides)",
  in_review: "In review",
  shortlisted: "Pass (override)",
  rejected: "Fail",
};
// Half-point rating scale: 0.5, 1, 1.5, … 9.5, 10 — mirrors the backend's
// accepted admin_score range.
const SCORE_OPTIONS = Array.from({ length: 20 }, (_, i) => (i + 1) / 2);

export default function InterviewToolsReviewPage({
  selectedInterviewPositionId,
  selectedInterviewSubmissionId,
  setActivePage,
  isSuperAdmin = false,
}) {
  const [detail, setDetail] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reviewStatus, setReviewStatus] = useState("in_review");
  const [manualScore, setManualScore] = useState("");
  const [loadedScore, setLoadedScore] = useState("");
  const [remarks, setRemarks] = useState("");
  const [overallStrength, setOverallStrength] = useState("");
  const [overallWeakness, setOverallWeakness] = useState("");
  const [saving, setSaving] = useState(false);
  // Click-to-confirm: replacing an existing answer score arms the target
  // button briefly; a second click applies it.
  const [pendingScore, setPendingScore] = useState(null);
  const pendingTimer = useRef(null);

  useEffect(() => () => clearTimeout(pendingTimer.current), []);
  useEffect(() => {
    setPendingScore(null);
    clearTimeout(pendingTimer.current);
  }, [activeIndex]);

  const STORAGE_KEY = `review_draft_${selectedInterviewPositionId}_${selectedInterviewSubmissionId}`;

  const loadDetail = useCallback(async () => {
    const res = await interviewToolsApi.getCandidateDetail(
      selectedInterviewPositionId,
      selectedInterviewSubmissionId,
    );
    const payload = res.data.data;
    setDetail(payload);
    setReviewStatus(payload.submission.overall_review_status || "in_review");
    setManualScore(payload.submission.overall_score || "");
    setLoadedScore(payload.submission.overall_score || "");

    const draft = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    setRemarks(payload.submission.remarks || draft.remarks || "");
    setOverallStrength(
      payload.submission.overall_strength || draft.overallStrength || "",
    );
    setOverallWeakness(
      payload.submission.overall_weakness || draft.overallWeakness || "",
    );
  }, [selectedInterviewPositionId, selectedInterviewSubmissionId, STORAGE_KEY]);

  useEffect(() => {
    if (!detail) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        remarks,
        overallStrength,
        overallWeakness,
      }),
    );
  }, [remarks, overallStrength, overallWeakness, STORAGE_KEY, detail]);

  useEffect(() => {
    if (!selectedInterviewPositionId || !selectedInterviewSubmissionId) return;
    loadDetail();
  }, [selectedInterviewPositionId, selectedInterviewSubmissionId, loadDetail]);

  const answerList = useMemo(() => detail?.answers || [], [detail]);
  const activeAnswer = answerList[activeIndex];

  const calculatedAverage = useMemo(() => {
    const valid = answerList
      .map((item) => Number(item.admin_score))
      .filter((score) => Number.isFinite(score));
    if (!valid.length) return "";
    return (
      valid.reduce((sum, value) => sum + value, 0) / valid.length
    ).toFixed(2);
  }, [answerList]);

  const applyScore = (questionId, nextScore) => {
    setDetail((prev) => ({
      ...prev,
      answers: prev.answers.map((item) =>
        item.question_id === questionId
          ? { ...item, admin_score: Number(nextScore) }
          : item,
      ),
    }));
  };

  const updateAnswerScore = (questionId, nextScore) => {
    const current = answerList.find((item) => item.question_id === questionId);
    const isOverride =
      current?.admin_score != null &&
      Number(current.admin_score) !== Number(nextScore);

    if (!isOverride) {
      setPendingScore(null);
      clearTimeout(pendingTimer.current);
      applyScore(questionId, nextScore);
      return;
    }

    if (pendingScore?.questionId === questionId && pendingScore?.score === nextScore) {
      setPendingScore(null);
      clearTimeout(pendingTimer.current);
      applyScore(questionId, nextScore);
      return;
    }

    setPendingScore({ questionId, score: nextScore });
    clearTimeout(pendingTimer.current);
    pendingTimer.current = setTimeout(() => setPendingScore(null), 2500);
  };

  const saveReview = async () => {
    setSaving(true);
    try {
      await interviewToolsApi.reviewCandidate(
        selectedInterviewPositionId,
        selectedInterviewSubmissionId,
        {
          overall_review_status: reviewStatus,
          overall_score: manualScore ? Number(manualScore) : null,
          remarks,
          overallStrength,
          overallWeakness,
          question_reviews: answerList.map((item) => ({
            question_id: item.question_id,
            admin_score: item.admin_score ? Number(item.admin_score) : null,
          })),
        },
      );
      localStorage.removeItem(STORAGE_KEY);
      await loadDetail();
    } finally {
      setSaving(false);
    }
  };

  if (!detail) {
    return (
      <div className="rounded-2xl bg-white p-12 text-center text-sm font-bold text-slate-500 shadow-sm uppercase tracking-widest ">
        Loading candidate review...
      </div>
    );
  }

  return (
    <div className="space-y-6 ">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setActivePage("interview-tools-candidates", {
              positionId: selectedInterviewPositionId,
            })
          }
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4 text-slate-500" />
          Back to Candidates
        </button>

        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await interviewToolsApi.downloadCandidatePDF(
                    selectedInterviewPositionId,
                    selectedInterviewSubmissionId,
                  );
                  const url = window.URL.createObjectURL(new Blob([res.data]));
                  const link = document.createElement("a");
                  link.href = url;
                  link.setAttribute(
                    "download",
                    `CandidateReport-${selectedInterviewSubmissionId}.pdf`,
                  );
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                } catch (error) {
                  console.error("PDF download failed:", error);
                  alert("Could not download PDF report");
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 shadow-sm"
            >
              <Download className="h-4 w-4 text-slate-500" />
              Download Report
            </button>
          )}

          <button
            type="button"
            onClick={saveReview}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#083262] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#052243] disabled:opacity-60 shadow-sm"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Review"}
          </button>
        </div>
      </div>

      {activeAnswer ? (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {detail.submission.candidate_name}
              </h2>
              <p className="mt-1.5 text-xs font-semibold text-slate-500">
                {detail.submission.candidate_email}
              </p>
              <p className="mt-0.5 text-xs font-medium text-slate-400">
                {detail.submission.candidate_phone}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                Questions
              </label>
              <div className="space-y-1.5">
                {answerList.map((item, index) => (
                  <button
                    key={item.question_id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                      activeIndex === index
                        ? "bg-[#083262] text-white shadow-sm"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-100"
                    }`}
                  >
                    <span className="truncate">
                      {item.question_order}. {item.title}
                    </span>
                    <span
                      title={item.answer_id ? undefined : "Not answered"}
                      className={`ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${activeIndex === index ? "bg-white/20" : "bg-white border border-slate-200"} ${!item.answer_id ? "text-slate-400" : ""}`}
                    >
                      {item.answer_id ? item.admin_score || "-" : "NA"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                Answer Rating
              </label>
              <div className="grid grid-cols-10 gap-1.5">
                {SCORE_OPTIONS.map((score) => {
                  const armed =
                    pendingScore?.questionId === activeAnswer.question_id &&
                    pendingScore?.score === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      disabled={!activeAnswer.answer_id}
                      onClick={() =>
                        updateAnswerScore(activeAnswer.question_id, score)
                      }
                      className={`flex h-9 items-center justify-center rounded-lg border text-xs font-bold transition shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${
                        armed
                          ? "border-amber-300 bg-amber-50 text-amber-700 scale-105"
                          : Number(activeAnswer.admin_score) === score
                            ? "border-[#083262] bg-[#083262] text-white scale-105"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      {armed ? "Sure?" : score}
                    </button>
                  );
                })}
              </div>
              {pendingScore?.questionId === activeAnswer.question_id ? (
                <p className="mt-2 text-[10px] font-semibold text-amber-600 ml-1">
                  Tap "{pendingScore.score}" again to replace score {activeAnswer.admin_score}
                </p>
              ) : null}
              {!activeAnswer.answer_id ? (
                <p className="mt-2 text-[10px] font-semibold text-slate-400 ml-1">
                  The candidate did not answer this question — scoring
                  unavailable.
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                Review Status
              </label>
              <select
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-[#083262] shadow-sm bg-slate-50 hover:bg-white transition"
              >
                {REVIEW_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {REVIEW_STATUS_LABELS[item] || item}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 ml-1 text-[10px] font-medium leading-snug text-slate-400">
                "Reviewed" resolves from the score —{" "}
                {detail?.review_min_score ?? 6.5} or above passes, below fails.
                "Pass" overrides the score.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 ml-1">
                  Calculated Average:
                </span>
                <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-xs">
                  {calculatedAverage || "-"}
                </span>
              </div>
              <input
                type="number"
                min="0.5"
                max="10"
                step="0.01"
                value={manualScore}
                onChange={(e) => setManualScore(e.target.value)}
                placeholder="Manual override score"
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-[#083262] shadow-sm transition"
              />
              {String(manualScore).trim() !== "" &&
              String(manualScore) !== String(loadedScore) ? (
                <p className="mt-1.5 text-[10px] font-semibold text-amber-600 ml-1">
                  Will override the calculated score
                  {calculatedAverage ? ` (${calculatedAverage})` : ""}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-6 flex flex-col h-full">
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <InterviewVideoPlayer
                  src={activeAnswer.question_video_url}
                  title="Question Prompt"
                  initialDurationSeconds={Number(
                    activeAnswer.video_duration_seconds || 0,
                  )}
                />
                {activeAnswer.question_video_download_url ||
                activeAnswer.question_video_url ? (
                  <a
                    href={
                      activeAnswer.question_video_download_url ||
                      activeAnswer.question_video_url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Download Question Video
                  </a>
                ) : null}
              </div>
              <div className="space-y-3">
                {activeAnswer.answer_video_url ? (
                  <InterviewVideoPlayer
                    src={activeAnswer.answer_video_url}
                    title="Candidate Answer"
                    initialDurationSeconds={Number(
                      activeAnswer.answer_duration_seconds || 0,
                    )}
                  />
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="relative flex aspect-video flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
                      <span className="absolute left-4 top-4 rounded-full bg-slate-200/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Candidate Answer
                      </span>
                      <VideoOff className="h-8 w-8 text-slate-300" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                          No answer submitted
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-slate-400">
                          The candidate did not record a response for this
                          question.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {activeAnswer.answer_video_download_url ||
                activeAnswer.answer_video_url ? (
                  <a
                    href={
                      activeAnswer.answer_video_download_url ||
                      activeAnswer.answer_video_url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Download Answer Video
                  </a>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                    Remarks
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="General thoughts on the candidate..."
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#083262] shadow-sm transition"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                    Overall Strength
                  </label>
                  <textarea
                    value={overallStrength}
                    onChange={(e) => setOverallStrength(e.target.value)}
                    placeholder="Candidate's strongest points..."
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#083262] shadow-sm transition"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                    Overall Weakness
                  </label>
                  <textarea
                    value={overallWeakness}
                    onChange={(e) => setOverallWeakness(e.target.value)}
                    placeholder="Areas needing improvement..."
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#083262] shadow-sm transition"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
