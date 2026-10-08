import { useState } from "react";
import { useSelector } from "react-redux";
import { completeIrelandWelcome } from "../../../api/irelandJobsApi";
import {
  SearchCheck,
  FileBadge,
  BriefcaseBusiness,
  RefreshCw,
  Image,
} from "lucide-react";
import { trackFlowAction } from "../../../telemetry/flow";

// Hero image for the welcome screen (16:9) — drop the final asset in
// src/assets and point this at it:
//   import irelandHeroImg from "../../../assets/ireland.webp"
//   const WELCOME_IMAGE = irelandHeroImg;
const WELCOME_IMAGE = null;

const FLOW_POINTS = [
  {
    icon: SearchCheck,
    text: "We analyse your profile and find the best opportunities for you in Ireland",
  },
  {
    icon: FileBadge,
    text: "Share your certificates and we help you figure out what is missing",
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
    <div className="w-full sm:max-w-md mx-auto pt-6 pb-10 flex flex-col gap-4">
      {/* Title block */}
      <div className="w-full flex flex-col items-start gap-1.5">
        <h2 className="w-full text-blue-950 text-2xl font-semibold tracking-tight">
          Welcome to Ireland Jobs
        </h2>
        <p className="w-full text-blue-950/70 text-xs sm:text-sm font-medium leading-relaxed">
          {user?.fullname ? `Hi ${user.fullname.split(" ")[0]}, you're` : "You're"}{" "}
          a few steps away from working in Ireland
        </p>
      </div>

      {/* 16:9 hero image */}
      <div className="w-full aspect-video rounded-xl overflow-hidden bg-gradient-to-b from-[#e0f2fe] to-[#f0f9ff] border border-blue-100/60 flex items-center justify-center">
        {WELCOME_IMAGE ? (
          <img
            src={WELCOME_IMAGE}
            alt="Ireland Jobs"
            className="w-full h-full object-cover"
            draggable="false"
          />
        ) : (
          <Image className="w-10 h-10 text-[#002856]/30" />
        )}
      </div>

      {/* Points card */}
      <div className="w-full p-4 bg-white rounded-xl outline outline-1 outline-offset-[-1px] outline-zinc-300 flex flex-col gap-4 overflow-hidden">
        <div className="w-full flex justify-between items-center">
          <h3 className="text-slate-900 text-sm font-semibold">
            How it works
          </h3>
          <span className="px-2 py-0.5 bg-green-700/10 rounded-full outline outline-1 outline-offset-[-1px] outline-green-700/20 text-green-700 text-[10px] font-medium">
            3 steps
          </span>
        </div>
        <div className="w-full flex flex-col items-start gap-4">
          {FLOW_POINTS.map(({ icon: Icon, text }) => (
            <div key={text} className="w-full flex items-center gap-3.5">
              <div className="w-10 h-10 shrink-0 bg-black/5 rounded-lg flex items-center justify-center">
                <Icon className="w-4 h-4 text-blue-950" />
              </div>
              <p className="flex-1 text-left text-black/70 text-xs sm:text-sm font-normal leading-relaxed">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Primary CTA */}
      <div className="w-full pt-2 flex flex-col items-start gap-2">
        {error && (
          <p className="text-red-500 text-xs font-semibold">{error}</p>
        )}
        <button
          type="button"
          onClick={handleStart}
          disabled={loading}
          className="w-full py-3 bg-blue-950 rounded-lg shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)] shadow-[inset_0px_-2px_0px_0px_rgba(10,13,18,0.05)] shadow-[inset_0px_0px_0px_1px_rgba(10,13,18,0.18)] outline outline-2 outline-offset-[-2px] outline-white/10 flex justify-center items-center gap-1.5 overflow-hidden cursor-pointer disabled:opacity-60 transition-opacity"
        >
          {loading ? (
            <span className="flex items-center gap-2 text-white text-sm font-semibold">
              <RefreshCw className="animate-spin h-4 w-4" />
              Preparing your process...
            </span>
          ) : (
            <span className="text-white text-sm font-semibold">Start</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default IrelandWelcomeStep;
