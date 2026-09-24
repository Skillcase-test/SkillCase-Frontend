import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Headphones, MoveRight } from "lucide-react";
import toast from "react-hot-toast";
import mayaWave from "../../../assets/onboarding/mayaWave.webp";
import { getB2TestOverview, startB2ExamSubmission } from "../../../api/b2Api";

const RING_R = 48;
const RING_CIRC = 2 * Math.PI * RING_R; // ~302
const COUNT_FROM = 3;

// Pre-test interstitial: counts down 3-2-1-Go, then starts the next
// placement chapter's submission and lands on its section dashboard. Used
// inline inside B2ExamGate (props passed, no fetch) and standalone at
// /b2/test/ready (fetches its own overview). The submission is only created
// at start — backing out leaves nothing behind.
export default function ExamGetReady({
  overview: overviewProp,
  onBack,
  onStarted,
} = {}) {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(overviewProp ?? null);
  const [loading, setLoading] = useState(!overviewProp);
  const [count, setCount] = useState(COUNT_FROM);
  const [starting, setStarting] = useState(false);
  const [failed, setFailed] = useState(false);
  const startRef = useRef(false);

  const nextPaper = overview?.nextPaper;
  const total = overview?.total ?? 0;
  const testNumber = (overview?.completed ?? 0) + 1;

  useEffect(() => {
    if (overviewProp) return;
    getB2TestOverview()
      .then((res) => setOverview(res.data))
      .catch((err) => {
        console.error("Failed to load test overview:", err);
        toast.error("Couldn't load your test. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [overviewProp]);

  // Nothing left to start (all chapters done / overview empty) — go back to
  // the test hub rather than sitting on a dead countdown.
  useEffect(() => {
    if (!loading && !nextPaper) {
      if (onBack) onBack();
      else navigate("/b2/test", { replace: true });
    }
  }, [loading, nextPaper, navigate, onBack]);

  const beginTest = useCallback(async () => {
    if (startRef.current || !nextPaper) return;
    startRef.current = true;
    setStarting(true);
    try {
      await startB2ExamSubmission(nextPaper.paperId);
      onStarted?.();
      navigate(`/b2/exams/papers/${nextPaper.paperId}/dashboard`, {
        replace: true,
      });
    } catch (err) {
      console.error("Error starting B2 test:", err);
      const resData = err.response?.data || {};
      if (err.response?.status === 403 && resData.alreadyCompleted) {
        navigate(`/b2/exams/papers/${nextPaper.paperId}/congratulations`, {
          replace: true,
        });
      } else {
        // 402 usage-limit responses are surfaced globally by the axios
        // interceptor — anything else is a genuine failure. Let the user
        // retry via "Start now".
        if (err.response?.status !== 402) {
          toast.error("Failed to start the test. Please try again.");
        }
        startRef.current = false;
        setStarting(false);
        setFailed(true);
      }
    }
  }, [nextPaper, navigate, onStarted]);

  // Countdown only runs once the paper is known — 3, 2, 1, then "Go" holds
  // for a second before the test actually starts. After a failed start the
  // countdown stops; "Start now" is the retry path.
  useEffect(() => {
    if (!nextPaper || starting || failed) return;
    const t = setTimeout(
      () => (count > 0 ? setCount((c) => c - 1) : beginTest()),
      1000,
    );
    return () => clearTimeout(t);
  }, [count, nextPaper, starting, failed, beginTest]);

  const ringOffset = RING_CIRC - (RING_CIRC * (COUNT_FROM - count)) / COUNT_FROM;

  return (
    <div className="fixed inset-0 z-[110] bg-gradient-to-b from-[#CFE3FF] to-[#E4EFFF] overflow-y-auto">
      <div className="w-full max-w-md lg:max-w-none mx-auto min-h-full flex flex-col">
        <div className="h-14 shrink-0 flex items-center justify-between pl-1 pr-2 bg-white border-b border-[#EFEFEF]">
          <button
            type="button"
            onClick={() => (onBack ? onBack() : navigate("/"))}
            aria-label="Back"
            className="w-11 h-11 flex items-center justify-center text-[#083262] bg-transparent border-0 cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="text-xs font-semibold text-[#083262] bg-[#E4EFFF] rounded-full px-3 py-1.5">
            Test {testNumber} of {total}
          </span>
        </div>

        <div className="flex-1 min-h-0 flex flex-col items-center justify-end gap-2.5 px-4 pt-4">
          <div className="bg-white border border-[#E9EAEB] rounded-xl px-3.5 py-2.5 shadow-[0_4px_13px_rgba(0,0,0,0.12)]">
            <p className="font-medium text-base text-[#414651]">
              You can do it!
            </p>
          </div>
          <img
            src={mayaWave}
            alt="Maya"
            className="flex-1 min-h-24 max-h-48 w-auto object-contain object-bottom select-none pointer-events-none"
          />
        </div>

        <div className="shrink-0 bg-white rounded-t-3xl px-4 pt-6 pb-6 flex flex-col items-center gap-5">
          <div className="flex flex-col items-center gap-3">
            <span className="font-semibold text-xl text-[#083262]">
              Your test starts in
            </span>
            <div className="relative w-28 h-28">
              <svg
                width="112"
                height="112"
                viewBox="0 0 112 112"
                className="-rotate-90"
              >
                <circle
                  cx="56"
                  cy="56"
                  r={RING_R}
                  fill="none"
                  stroke="#E4EFFF"
                  strokeWidth="8"
                />
                <circle
                  cx="56"
                  cy="56"
                  r={RING_R}
                  fill="none"
                  stroke="#EDB843"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={ringOffset}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-bold text-[44px] text-[#083262]">
                {count > 0 ? count : "Go"}
              </span>
            </div>
          </div>

          <div className="self-stretch flex flex-col gap-2.5">
            <div className="flex gap-3 items-center">
              <span className="w-9 h-9 rounded-[10px] bg-[#E4EFFF] text-[#083262] flex items-center justify-center shrink-0">
                <Headphones className="w-[18px] h-[18px]" strokeWidth={2} />
              </span>
              <span className="text-sm text-[#414651]">
                Put your headphones on
              </span>
            </div>
            <div className="flex gap-3 items-center">
              <span className="w-9 h-9 rounded-[10px] bg-[#E4EFFF] text-[#083262] flex items-center justify-center shrink-0">
                <MoveRight className="w-[18px] h-[18px]" strokeWidth={2} />
              </span>
              <span className="text-sm text-[#414651]">
                Don't know? Tap Skip. You lose no marks.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setFailed(false);
              beginTest();
            }}
            disabled={starting || !nextPaper}
            className="self-stretch h-12 rounded-lg border border-[#DBDBDB] bg-white text-[#083262] text-base font-semibold hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center"
          >
            Start now
          </button>
        </div>
      </div>
    </div>
  );
}
