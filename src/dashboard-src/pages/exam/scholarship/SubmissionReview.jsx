import { useScholarshipWorkspace, questionLabel } from "./index";
import Modal from "./ui/Modal";
import { btn } from "./ui/buttons";
import {
  formatAnswerValue,
  formatCorrectAnswer,
} from "../../../../utils/scholarshipAnswers";

/**
 * Per-submission review modal: every question with the student's answer vs
 * the correct one, "Mark Correct / Mark Wrong" toggles, and composite
 * sub-item grading chips with a Save Corrections action.
 */
export default function SubmissionReview() {
  const {
    submissionDetail,
    setSubmissionDetail,
    itemOverrides,
    setItemOverrides,
    handleOverrideAnswer,
    handleOverrideAnswerPoints,
  } = useScholarshipWorkspace();

  if (!submissionDetail) return null;

  const submission = submissionDetail.submission;

  return (
    <Modal
      title={`Submission review — ${submission.fullname || submission.username}`}
      subtitle={`@${submission.username} · ${submission.score !== null ? `${parseFloat(submission.score).toFixed(1)}%` : "—"} · ${parseFloat(submission.earned_points || 0).toFixed(2)} / ${parseFloat(submission.total_points || 0).toFixed(2)} pts`}
      onClose={() => setSubmissionDetail(null)}
      size="xl"
      footer={
        <button onClick={() => setSubmissionDetail(null)} className={btn.secondary}>
          Close
        </button>
      }
    >
      <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
        {submissionDetail.questions.map((q) => {
          const qType = q.question_type;
          const qData = q.question_data;

          // ── Non-answerable blocks render as their content, not questions ──
          if (qType === "page_break") {
            return (
              <div key={q.question_id} className="flex items-center gap-3 py-1">
                <div className="flex-1 border-t-2 border-dashed border-slate-200" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Page Break
                </span>
                <div className="flex-1 border-t-2 border-dashed border-slate-200" />
              </div>
            );
          }
          if (qType === "reading_passage") {
            return (
              <div
                key={q.question_id}
                className="bg-white border-2 border-blue-100 rounded-xl p-4"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-2">
                  Reading Passage
                </p>
                <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap break-words">
                  {qData?.passage || qData?.text || ""}
                </p>
              </div>
            );
          }
          if (qType === "content_block") {
            return (
              <div
                key={q.question_id}
                className="bg-white border-2 border-slate-100 rounded-xl p-4"
              >
                <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap break-words">
                  {qData?.content || qData?.text || ""}
                </p>
              </div>
            );
          }
          if (qType === "audio_block") {
            return (
              <div
                key={q.question_id}
                className="bg-white border-2 border-amber-100 rounded-xl p-4"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-2">
                  Audio
                </p>
                {q.audio_url ? (
                  <audio
                    controls
                    src={q.audio_url}
                    className="w-full max-w-sm h-10"
                    preload="none"
                  />
                ) : (
                  <p className="text-xs text-slate-400">No audio uploaded</p>
                )}
              </div>
            );
          }
          if (qType === "image_block") {
            return (
              <div
                key={q.question_id}
                className="bg-white border-2 border-violet-100 rounded-xl p-4 flex justify-center"
              >
                {qData?.image_url ? (
                  <img
                    src={qData.image_url}
                    alt={qData.alt || ""}
                    style={{ display: "block", maxWidth: "100%" }}
                    className="rounded-lg"
                  />
                ) : (
                  <p className="text-xs text-slate-400">No image uploaded</p>
                )}
              </div>
            );
          }

          // ── Answerable question ──
          const isPending =
            q.question_type === "paragraph" && q.user_answer && q.is_correct === null;
          const unanswered =
            q.user_answer === null || q.user_answer === undefined || q.user_answer === "";
          const correct =
            q.is_correct === true ? true : q.is_correct === false ? false : null;
          const borderColor = unanswered
            ? "border-slate-200"
            : correct === true
              ? "border-green-200"
              : correct === false
                ? "border-red-200"
                : "border-amber-200";
          const labelColor = unanswered
            ? "text-slate-400"
            : isPending
              ? "text-amber-600"
              : correct === true
                ? "text-green-600"
                : "text-red-500";

          const correctAns = formatCorrectAnswer(qData, qType);

          return (
            <div key={q.question_id} className={`bg-white border-2 ${borderColor} rounded-xl p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1">
                    {q.question_type.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm font-medium text-slate-800 mb-2 whitespace-pre-wrap break-words">
                    {questionLabel(q)}
                  </p>
                  {q.question_data?.question_image && (
                    <img src={q.question_data.question_image} alt="" className="max-h-24 rounded mb-2" />
                  )}
                  <div className="flex flex-wrap gap-4 text-sm mt-1">
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Student answered</p>
                      <div className="font-medium">
                        {formatAnswerValue(q.user_answer, qType, qData)}
                      </div>
                    </div>
                    {correctAns !== null && correctAns !== undefined && (
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Correct answer</p>
                        <div className="font-medium text-green-700">{correctAns}</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-xs font-bold ${labelColor}`}>
                    {unanswered
                      ? "—"
                      : isPending
                        ? "Pending review"
                        : correct
                          ? `+${parseFloat(q.points_earned || 0).toFixed(2)} pts`
                          : q.question_type === "composite_question"
                            ? `${parseFloat(q.points_earned || 0).toFixed(2)} / ${q.points} pts`
                            : `0 / ${q.points} pts`}
                  </span>
                  {!unanswered && q.question_type !== "composite_question" && (
                    <button
                      onClick={() => handleOverrideAnswer(q.question_id)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold border transition-all ${
                        correct === true
                          ? "border-red-300 text-red-600 hover:bg-red-50"
                          : "border-green-400 text-green-700 hover:bg-green-50"
                      }`}
                    >
                      {correct === true ? "Mark Wrong" : "Mark Correct"}
                    </button>
                  )}
                </div>
              </div>

              {/* Composite per-item overrides */}
              {!unanswered &&
                q.question_type === "composite_question" &&
                (() => {
                  let ans = q.user_answer;
                  try {
                    ans = typeof q.user_answer === "string" ? JSON.parse(q.user_answer) : q.user_answer;
                  } catch {
                    /* keep */
                  }
                  const items =
                    ans && typeof ans === "object" && !Array.isArray(ans)
                      ? Object.keys(ans).sort((a, b) => Number(a) - Number(b))
                      : [];
                  const localOverrides = itemOverrides[q.question_id] || {};
                  const qItems = q.question_data?.items || [];
                  const getItemAutoCorrect = (idx) => {
                    const item = qItems[idx];
                    if (!item) return false;
                    const userVal = ans[String(idx)];
                    if (item.correct === undefined || item.correct === null) return false;
                    if (Array.isArray(item.correct)) {
                      const userBlanks = Array.isArray(userVal) ? userVal : [userVal];
                      return item.correct.every((c, i) =>
                        String(c ?? "").trim().toLowerCase() ===
                        String(userBlanks[i] ?? "").trim().toLowerCase(),
                      );
                    }
                    return (
                      String(item.correct ?? "").trim().toLowerCase() ===
                      String(userVal ?? "").trim().toLowerCase()
                    );
                  };
                  const itemStates = items.map((k, i) =>
                    k in localOverrides ? localOverrides[k] : getItemAutoCorrect(i),
                  );
                  const correctCount = itemStates.filter(Boolean).length;
                  const computedPoints =
                    items.length > 0
                      ? (correctCount / items.length) * parseFloat(q.points || 0)
                      : 0;
                  const hasLocalChanges = Object.keys(localOverrides).length > 0;
                  return (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-slate-400">
                          Click chips to toggle sub-item grades
                        </p>
                        <p className="text-xs font-semibold text-slate-600">
                          {correctCount}/{items.length} correct → {computedPoints.toFixed(2)} pts
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {items.map((k, i) => {
                          const isOk = itemStates[i];
                          return (
                            <button
                              key={k}
                              onClick={() =>
                                setItemOverrides((prev) => ({
                                  ...prev,
                                  [q.question_id]: {
                                    ...(prev[q.question_id] || {}),
                                    [k]: !isOk,
                                  },
                                }))
                              }
                              className={`text-xs px-2 py-0.5 rounded font-semibold border transition-all ${
                                isOk
                                  ? "bg-green-100 border-green-400 text-green-700 hover:bg-green-200"
                                  : "bg-red-50 border-red-300 text-red-600 hover:bg-red-100"
                              }`}
                            >
                              {Number(k) + 1} {isOk ? "✓" : "✗"}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => handleOverrideAnswerPoints(q.question_id, computedPoints)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                          hasLocalChanges
                            ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                            : "border-blue-300 text-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        Save Corrections
                      </button>
                    </div>
                  );
                })()}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
