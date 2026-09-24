import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { BookOpen, Headphones, PenLine, Mic } from "lucide-react";
import mayaWave from "../../assets/onboarding/mayaWave.webp";
import ExamGetReady from "../../pages/b2/exams/ExamGetReady";
import api from "../../api/axios";
import { setB2ExamGateSeen } from "../../redux/auth/authSlice";
import { useUsageLimits } from "../../hooks/useUsageLimits";
import { hapticLight } from "../../utils/haptics";

const SKILLS = [
  { label: "Reading", Icon: BookOpen },
  { label: "Listening", Icon: Headphones },
  { label: "Writing", Icon: PenLine },
  { label: "Speaking", Icon: Mic },
];

/**
 * First-arrival gate for B2 practice: shown over the feature grid the first
 * time a B2 learner reaches the suite (app_user.b2_exam_gate_seen = false).
 * "Start my test" routes to the get-ready countdown which creates the
 * submission; "Later" continues to practice. Either answer marks the gate
 * seen — it is never asked again.
 */
export default function B2ExamGate({ overview }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { getState } = useUsageLimits();
  const [showReady, setShowReady] = useState(false);

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

  const handleStart = () => {
    // No direct-start paper (none active / all completed / overview failed)
    // — still mark seen and land the learner on the test hub.
    if (!nextPaper) {
      hapticLight();
      markSeen();
      navigate("/b2/test");
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
    // Swap to the countdown inside this overlay — no route change, so the
    // gate never flashes the home page. The gate is marked seen when the
    // test actually starts (onStarted) or the user backs out (onBack).
    setShowReady(true);
  };

  if (showReady) {
    return (
      <ExamGetReady
        overview={overview}
        onBack={markSeen}
        onStarted={markSeen}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[110] bg-gradient-to-b from-[#CFE3FF] to-[#E4EFFF] overflow-y-auto">
      <div className="w-full max-w-md lg:max-w-none mx-auto min-h-full flex flex-col">
        <div className="h-14 shrink-0 flex items-center justify-between px-4 bg-white border-b border-[#EFEFEF]">
          <img
            src="/mainlogo.webp"
            alt="Skillcase"
            className="h-24 w-24 object-contain"
          />
          <span className="text-xs font-semibold text-[#083262] bg-[#E4EFFF] rounded-full px-2.5 py-1">
            B2 · for nurses
          </span>
        </div>

        <div className="flex-1 min-h-0 flex flex-col items-center justify-end gap-2 px-4 pt-4">
          <div className="bg-white border border-[#E9EAEB] rounded-xl px-3.5 py-2 shadow-[0_4px_13px_rgba(0,0,0,0.12)]">
            <p className="font-medium text-base text-[#414651]">
              Hallo! I'm Maya.
            </p>
          </div>
          <img
            src={mayaWave}
            alt="Maya waving"
            className="flex-1 min-h-28 max-h-52 w-auto object-contain object-bottom select-none pointer-events-none"
          />
        </div>

        <div className="shrink-0 bg-white rounded-t-3xl px-4 pt-6 pb-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="font-semibold text-xl leading-tight text-[#002856]">
              Well done! You made it to B2.
            </h1>
            <p className="text-xs leading-relaxed text-slate-400">
              First, a {nextPaper?.durationMinutes ?? 15}-minute test. It
              shows us where you currently stand.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {SKILLS.map(({ label, Icon }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5"
              >
                <span className="w-12 h-12 rounded-xl bg-[#E4EFFF] text-[#083262] flex items-center justify-center">
                  <Icon className="w-[22px] h-[22px]" strokeWidth={2} />
                </span>
                <span className="text-xs font-medium text-[#414651]">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={handleStart}
              className="h-12 rounded-lg bg-[#EDB843] text-[#083262] text-base font-semibold hover:bg-[#e0aa2f] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Start my test
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="h-11 rounded-lg text-[#535862] text-[15px] font-medium hover:bg-slate-50 active:scale-[0.98] transition-all"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
