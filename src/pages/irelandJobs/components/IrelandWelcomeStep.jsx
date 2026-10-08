import { useState } from "react";
import { useSelector } from "react-redux";
import { completeIrelandWelcome } from "../../../api/irelandJobsApi";
import { SearchCheck, FileBadge, BriefcaseBusiness, RefreshCw } from "lucide-react";
import { trackFlowAction } from "../../../telemetry/flow";

// Hero image for the welcome screen — drop the final asset in src/assets and
// point this at it (e.g. `import irelandHeroImg from "../../../assets/ireland.webp"`).
const WELCOME_IMAGE = null;

const POINTERS = [
  {
    icon: SearchCheck,
    text: "We analyse your profile and find the best opportunities for you in Ireland",
  },
  {
    icon: FileBadge,
    text: "Share your certificates — we help you figure out what is missing",
  },
  {
    icon: BriefcaseBusiness,
    text: "Get interviews lined up for Nurse and Caregiver roles",
  },
];

const IrelandWelcomeStep = ({ onComplete }) => {
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async () => {
    trackFlowAction("ireland_jobs", "ireland_funnel", "welcome_started", {
      step: "welcome",
      lifecycle: "started",
    });
    try {
      setLoading(true);
      setError("");
      const { data } = await completeIrelandWelcome();
      if (data?.success) {
        trackFlowAction("ireland_jobs", "ireland_funnel", "welcome_completed", {
          step: "welcome",
          lifecycle: "succeeded",
        });
        onComplete?.(data.data);
      } else {
        setError("Failed to continue to the next step");
      }
    } catch (err) {
      trackFlowAction("ireland_jobs", "ireland_funnel", "welcome_failed", {
        step: "welcome",
        lifecycle: "failed",
        reasonCode: "api_failed",
      });
      console.error(err);
      setError(err.response?.data?.message || "Failed to continue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full sm:max-w-md mx-auto bg-white text-slate-800 pt-8 sm:pt-10 pb-4 px-4 sm:px-6 flex flex-col items-center justify-start text-center">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#002856] tracking-tight leading-tight mb-2">
        Welcome to Ireland Jobs
      </h2>
      <p className="text-slate-500 text-xs sm:text-sm leading-relaxed max-w-xs">
        {user?.fullname ? `Hi ${user.fullname.split(" ")[0]}, you're` : "You're"}{" "}
        a few steps away from working in Ireland
      </p>

      {/* Hero image slot */}
      <div className="w-full max-w-xs my-6 flex items-center justify-center">
        {WELCOME_IMAGE ? (
          <img
            src={WELCOME_IMAGE}
            alt="Ireland Jobs"
            className="w-full max-h-56 object-contain"
            draggable="false"
          />
        ) : (
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-3xl bg-gradient-to-b from-[#e0f2fe] to-[#f0f9ff] border border-blue-100/60 flex items-center justify-center shadow-inner">
            <BriefcaseBusiness className="w-16 h-16 text-[#002856]/60" />
          </div>
        )}
      </div>

      {/* Pointers */}
      <div className="w-full max-w-sm flex flex-col gap-3 mb-6 text-left">
        {POINTERS.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-3 bg-slate-50/50 border border-slate-200/60 rounded-2xl px-4 py-3"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-[#083262]" />
            </div>
            <span className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">
              {text}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-red-500 text-xs font-semibold mb-3">{error}</p>
      )}

      <div className="w-full flex flex-col gap-3 max-w-sm">
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full h-12 bg-gradient-to-r from-amber-200 to-amber-300 hover:from-amber-300 hover:to-amber-400 text-[#002856] rounded-xl font-bold text-sm sm:text-base transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-md cursor-pointer border border-amber-300/80 disabled:opacity-75"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="animate-spin h-4 w-4 text-[#002856]" />
              Preparing your process...
            </span>
          ) : (
            <span>Start</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default IrelandWelcomeStep;
