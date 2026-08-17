import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { Gem, Loader2, X } from "lucide-react";
import api from "../api/axios";
import { setUser } from "../redux/auth/authSlice";
import mayaSad from "../assets/onboarding/mayaSad.webp";
import {
  hasTakenTrial,
  isPremiumUser,
  isTrialActive,
  isTrialEndedDismissed,
} from "../utils/premium";
import { trackFeatureEvent } from "../telemetry/events";

const PREMIUM_FEATURES = [
  "Streak Challenges",
  "German Lessons",
  "Flashcards",
  "Pronunciation practice",
  "Exam practice",
];

function PriceRow() {
  return (
    <div className="text-center">
      <span className="text-[#002856] text-4xl font-bold">₹99 </span>
      <span className="text-[#002856] text-base font-normal">/ month</span>
    </div>
  );
}

function FeatureRows() {
  return (
    <div className="self-stretch flex flex-col items-start gap-1">
      {PREMIUM_FEATURES.map((feature) => (
        <div
          key={feature}
          className="self-stretch inline-flex justify-between items-center"
        >
          <span className="text-center text-[#002856] text-xs font-normal">
            {feature}
          </span>
          <span className="flex justify-start items-center gap-2">
            <span className="text-center text-[#002856] text-xs font-medium">
              Unlimited
            </span>
            <span className="size-2.5 bg-green-600 rounded-full" />
          </span>
        </div>
      ))}
    </div>
  );
}

// Shown once after the 7-day trial expires: upgrade or permanently continue
// on the free plan (the choice is stored server-side so it never comes back).
export default function TrialEndedModal() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [closed, setClosed] = useState(false);

  const shouldShow =
    !closed &&
    user &&
    !isPremiumUser(user) &&
    !isTrialActive(user) &&
    hasTakenTrial(user) &&
    !isTrialEndedDismissed(user);

  useEffect(() => {
    if (shouldShow) {
      trackFeatureEvent("payments", "trial_ended_presented");
    }
  }, [shouldShow]);

  if (!shouldShow) {
    return null;
  }

  const dismiss = async () => {
    trackFeatureEvent("payments", "trial_ended_dismissed");
    setLoading(true);
    try {
      const { data } = await api.post("/user/dismiss-trial-ended");
      dispatch(setUser(data.user));
    } catch (err) {
      // Persisting the choice is best-effort. This is a full-screen overlay, so
      // failing to record it must never leave the user locked out of the app —
      // close locally and let the next successful load re-persist it.
      console.error("Dismiss trial ended error:", err);
      setClosed(true);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    trackFeatureEvent("payments", "trial_ended_upgrade_clicked");
    navigate("/profile/upgrade");
  };

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center p-4 backdrop-blur-xs select-none "
      style={{
        background:
          "radial-gradient(circle, rgba(15, 23, 42, 0.65) 0%, rgba(2, 6, 23, 0.95) 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-[390px] bg-white rounded-3xl px-6 pt-10 pb-6 relative flex flex-col items-start gap-2.5 max-h-[92dvh] overflow-y-auto"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          disabled={loading}
          className="absolute top-2.5 right-2.5 size-7 rounded-full bg-black/25 text-white flex items-center justify-center cursor-pointer hover:bg-black/40 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="self-stretch flex flex-col items-center gap-6">
          <div className="self-stretch flex flex-col items-center gap-3">
            <div className="size-24 bg-blue-100 rounded-[58.54px] overflow-hidden shrink-0">
              <img
                src={mayaSad}
                alt="Maya sad the trial has ended"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="self-stretch flex flex-col items-center gap-7">
              <div className="self-stretch flex flex-col items-center gap-3">
                <h2 className="self-stretch text-center text-[#002856] text-2xl font-bold leading-8">
                  Your 7-days Premium trial has ended
                </h2>
                <p className="w-64 text-center text-[#002856] text-xs font-normal leading-5">
                  Continue with Free Plan or upgrade to Premium to unlock all
                  features again.
                </p>
              </div>

              <div className="self-stretch flex flex-col items-center">
                <div className="self-stretch px-1.5 py-1 bg-gradient-to-r from-[#002856] to-blue-700 rounded-tl-xl rounded-tr-xl inline-flex justify-center items-center gap-2">
                  <Gem className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-center text-white text-xs font-normal">
                    Premium Plan
                  </span>
                </div>
                <div className="self-stretch px-4 pt-2.5 pb-4 bg-black/5 rounded-bl-xl rounded-br-xl flex flex-col justify-center items-center gap-4">
                  <PriceRow />
                  <div className="self-stretch border-t border-stone-300" />
                  <FeatureRows />
                </div>
              </div>
            </div>
          </div>

          <div className="self-stretch flex flex-col justify-center items-center gap-2">
            <motion.button
              type="button"
              onClick={handleUpgrade}
              whileTap={{ scale: 0.985 }}
              className="self-stretch px-4 py-3 bg-[#002856] hover:bg-[#001f42] active:bg-[#001f42] rounded-lg shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)] outline-offset-[-2px] outline-white/10 inline-flex justify-center items-center gap-1.5 overflow-hidden text-white text-base font-semibold cursor-pointer transition-colors"
            >
              <Gem className="w-5 h-5 text-amber-300" />
              <span>Upgrade to Premium</span>
            </motion.button>
            <motion.button
              type="button"
              onClick={dismiss}
              disabled={loading}
              whileTap={{ scale: 0.985 }}
              className="self-stretch px-4 py-3 rounded-lg outline outline-offset-[-1px] outline-zinc-400 inline-flex justify-center items-center gap-1.5 text-[#002856] text-base font-semibold cursor-pointer transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#002856]" />
              ) : (
                "Continue with Free Plan"
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
