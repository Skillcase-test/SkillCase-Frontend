import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import mayaWave from "../../assets/onboarding/mayaWave.webp";
import { startB2ExamSubmission } from "../../api/b2Api";
import api from "../../api/axios";
import { setB2ExamGateSeen } from "../../redux/auth/authSlice";
import { useUsageLimits } from "../../hooks/useUsageLimits";
import { hapticLight } from "../../utils/haptics";

const TAKEAWAYS = [
  "Your level in reading, listening, writing and speaking",
  "Your strong and weak areas, side by side",
  "A clear starting point for your practice",
];

/**
 * First-arrival gate for B2 practice: shown over the feature grid the first
 * time a B2 learner reaches the suite (app_user.b2_exam_gate_seen = false).
 * "Start exam" launches the next unattempted paper; "Skip" continues to
 * practice. Either answer marks the gate seen — it is never asked again.
 */
export default function B2ExamGate({ overview }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { getState } = useUsageLimits();
  const [starting, setStarting] = useState(false);

  const nextPaper = overview?.nextPaper;
  const examState = getState("B2", "exams");

  const markSeen = () => {
    dispatch(setB2ExamGateSeen());
    api.post("/user/complete-b2-exam-gate").catch((err) => {
      console.error("Failed to persist B2 exam gate:", err);
    });
  };

  const handleSkip = () => {
    hapticLight();
    markSeen();
  };

  const handleStart = async () => {
    if (starting) return;
    // No direct-start paper (none active / all completed / overview failed)
    // — still mark seen and land the learner on the paper list.
    if (!nextPaper) {
      hapticLight();
      markSeen();
      navigate("/b2/exams");
      return;
    }
    if (examState?.locked) {
      window.dispatchEvent(
        new CustomEvent("skillcase:usage-limit", {
          detail: {
            locked: true,
            reason: "usage_limit",
            module_key: "exams",
            level: "B2",
            limit_value: examState.limit_value,
            periods: examState.periods,
            reset_at: examState.reset_at,
            msg: examState.hard_locked
              ? "This feature is currently locked."
              : "Your limit for this feature has been reached.",
          },
        }),
      );
      return;
    }
    hapticLight();
    setStarting(true);
    try {
      await startB2ExamSubmission(nextPaper.paperId);
      markSeen();
      navigate(`/b2/exams/papers/${nextPaper.paperId}/dashboard`);
    } catch (err) {
      console.error("Error starting B2 exam from gate:", err);
      const resData = err.response?.data || {};
      if (err.response?.status === 403 && resData.alreadyCompleted) {
        markSeen();
        navigate(`/b2/exams/papers/${nextPaper.paperId}/congratulations`);
      } else if (err.response?.status !== 402) {
        // 402 usage-limit responses are surfaced globally by the axios
        // interceptor — anything else is a genuine failure.
        toast.error("Failed to start exam. Please try again.");
      }
      setStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-white overflow-y-auto">
      <div className="w-full max-w-md lg:max-w-none mx-auto min-h-full flex flex-col px-5 pt-4 pb-6">
        <div className="flex items-start gap-3 mt-6">
          <img
            src={mayaWave}
            alt="Maya"
            className="w-16 h-16 object-cover shrink-0"
          />
          <div className="bg-white border border-zinc-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
            <p className="text-sky-950 text-sm font-medium leading-snug">
              Hi! Ready to find out where you stand? The first exam takes
              about {nextPaper?.durationMinutes ?? 15} minutes.
            </p>
          </div>
        </div>

        <p className="mt-8 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          After this, you'll know
        </p>
        <ul className="mt-3 flex flex-col gap-3">
          {TAKEAWAYS.map((line) => (
            <li key={line} className="flex items-start gap-2.5">
              <Check
                className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0"
                strokeWidth={3}
              />
              <span className="text-sky-950 text-sm leading-snug">{line}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 bg-black/5 rounded-2xl px-4 py-3.5">
          <p className="text-slate-500 text-xs leading-relaxed">
            You get a real score, not just a label. That score shapes every
            practice suggestion that follows.
          </p>
        </div>

        <div className="flex-1" />

        <div className="flex gap-3 pt-8">
          <button
            type="button"
            onClick={handleSkip}
            disabled={starting}
            className="flex-1 py-3.5 rounded-xl border border-zinc-300 text-slate-500 text-sm font-semibold hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={starting}
            className="flex-[2] py-3.5 rounded-xl bg-[#002856] text-white text-sm font-semibold hover:bg-[#003a73] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
          >
            {starting && <Loader2 className="w-4 h-4 animate-spin" />}
            Start exam
          </button>
        </div>
      </div>
    </div>
  );
}
