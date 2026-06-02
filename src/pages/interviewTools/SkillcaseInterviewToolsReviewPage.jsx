import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Save } from "lucide-react";
import { skillcaseInterviewToolsApi } from "../../api/skillcaseInterviewToolsApi";
import InterviewVideoPlayer from "./shared/InterviewVideoPlayer";

const REVIEW_STATUSES = ["completed", "in_review", "shortlisted", "rejected"];

export default function SkillcaseInterviewToolsReviewPage({
  selectedInterviewPositionId,
  selectedInterviewSubmissionId,
  setActivePage,
  canDownload = false,
  isSuperAdmin = false,
}) {
  const [detail, setDetail] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reviewStatus, setReviewStatus] = useState("in_review");
  const [manualScore, setManualScore] = useState("");
  const [remarks, setRemarks] = useState("");
  const [overallStrength, setOverallStrength] = useState("");
  const [overallWeakness, setOverallWeakness] = useState("");
  const [saving, setSaving] = useState(false);

  const STORAGE_KEY = `review_draft_${selectedInterviewPositionId}_${selectedInterviewSubmissionId}`;

  const loadDetail = async () => {
    const res = await skillcaseInterviewToolsApi.getCandidateDetail(
      selectedInterviewPositionId,
      selectedInterviewSubmissionId,
    );
    const payload = res.data.data;
    setDetail(payload);
    setReviewStatus(payload.submission.overall_review_status || "in_review");
    setManualScore(payload.submission.overall_score || "");

    const draft = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    setRemarks(payload.submission.remarks || draft.remarks || "");
    setOverallStrength(
      payload.submission.overall_strength || draft.overallStrength || "",
    );
    setOverallWeakness(
      payload.submission.overall_weakness || draft.overallWeakness || "",
    );
  };

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
  }, [selectedInterviewPositionId, selectedInterviewSubmissionId]);

  const answerList = detail?.answers || [];
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

  const updateAnswerScore = (questionId, nextScore) => {
    setDetail((prev) => ({
      ...prev,
      answers: prev.answers.map((item) =>
        item.question_id === questionId
          ? { ...item, admin_score: Number(nextScore) }
          : item,
      ),
    }));
  };

  const saveReview = async () => {
    setSaving(true);
    try {
      await skillcaseInterviewToolsApi.reviewCandidate(
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
      <div className="rounded-2xl bg-white p-12 text-center text-sm font-bold text-slate-500 shadow-sm uppercase tracking-widest font-sans">
        Loading learner review...
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
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
          Back to Learners
        </button>

        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const res =
                    await skillcaseInterviewToolsApi.downloadCandidatePDF(
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
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {detail.submission.candidate_name}
              </h2>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                Review Status
              </label>
              <select
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-800 outline-none focus:border-[#083262] shadow-sm bg-slate-50 hover:bg-white transition"
              >
                {REVIEW_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 ml-1">
                  Calculated Average:
                </span>
                <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-xs">
                  {calculatedAverage || "-"}
                </span>
              </div>
              <input
                type="number"
                min="1"
                max="10"
                step="0.01"
                value={manualScore}
                onChange={(e) => setManualScore(e.target.value)}
                placeholder="Manual override score"
                className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm font-semibold outline-none focus:border-[#083262] shadow-sm transition"
              />

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                    Remarks
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="General thoughts on the learner..."
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-[#083262] shadow-sm transition"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                    Overall Strength
                  </label>
                  <textarea
                    value={overallStrength}
                    onChange={(e) => setOverallStrength(e.target.value)}
                    placeholder="Learner's strongest points..."
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-[#083262] shadow-sm transition"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                    Overall Weakness
                  </label>
                  <textarea
                    value={overallWeakness}
                    onChange={(e) => setOverallWeakness(e.target.value)}
                    placeholder="Areas needing improvement..."
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-[#083262] shadow-sm transition"
                  />
                </div>
              </div>
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
                {canDownload &&
                (activeAnswer.question_video_download_url ||
                  activeAnswer.question_video_url) ? (
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
                <InterviewVideoPlayer
                  src={activeAnswer.answer_video_url}
                  title="Learner Answer"
                  initialDurationSeconds={Number(
                    activeAnswer.answer_duration_seconds || 0,
                  )}
                />
                {canDownload &&
                (activeAnswer.answer_video_download_url ||
                  activeAnswer.answer_video_url) ? (
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
                    Download Learner Video
                  </a>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <label className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                Answer Rating
              </label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() =>
                      updateAnswerScore(activeAnswer.question_id, score)
                    }
                    className={`flex h-10 min-w-[3rem] flex-1 items-center justify-center rounded-xl border text-sm font-bold transition shadow-sm ${
                      Number(activeAnswer.admin_score) === score
                        ? "border-[#083262] bg-[#083262] text-white scale-105"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-2">
                {answerList.map((item, index) => (
                  <button
                    key={item.question_id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-sm font-bold transition ${
                      activeIndex === index
                        ? "bg-[#083262] text-white shadow-sm"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-100"
                    }`}
                  >
                    <span>
                      {item.question_order}. {item.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${activeIndex === index ? "bg-white/20" : "bg-white border border-slate-200"}`}
                    >
                      {item.admin_score || "-"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
