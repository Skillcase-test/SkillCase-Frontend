import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { Check, Gem, Phone, X } from "lucide-react";
import mayaSad from "../assets/onboarding/mayaSad.webp";
import timerImg from "../assets/timer.webp";
import { isPremiumUser, isTrialActive, trialDaysLeft } from "../utils/premium";
import { trackFeatureEvent } from "../telemetry/events";

// Per-user "last dismissed" day (local calendar date). Dismissing the modal
// only silences it for the rest of that day, so it comes back once a day as
// the trial runs out (2 days left → 1 day left → expires today). Stored in
// localStorage so a second account logging in later still gets its own flag.
const dismissedKey = (userId) => `trial_countdown_dismissed_${userId || "anon"}`;
const todayStr = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

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
            <span className="size-2.5 bg-green-600 rounded-full">
              <Check className="text-white size-full" />
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// Auto-shows at most once per day while the free trial has <= 2 days left,
// until the user upgrades or the trial ends (at which point TrialEndedModal
// takes over). Tapping a trial push reminder lands on home, where this is
// mounted.
export default function TrialCountdownModal() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  // Local dismissal state so the X closes the modal immediately — without it
  // the memoized shouldShow wouldn't recompute until a refresh (localStorage
  // writes alone don't re-render).
  const [dismissedToday, setDismissedToday] = useState(false);

  const shouldShow = useMemo(() => {
    if (!user || isPremiumUser(user) || !isTrialActive(user)) return false;
    if (trialDaysLeft(user) > 2) return false;
    if (dismissedToday) return false;
    try {
      return localStorage.getItem(dismissedKey(user.user_id)) !== todayStr();
    } catch {
      return true;
    }
  }, [user, dismissedToday]);

  const daysLeft = user ? trialDaysLeft(user) : 0;

  useEffect(() => {
    if (shouldShow) {
      trackFeatureEvent("payments", "trial_countdown_presented", {
        attributes: { days_left: daysLeft },
      });
    }
  }, [shouldShow, daysLeft]);

  // Dismisses the modal for today only — it may open again tomorrow.
  const dismissToday = () => {
    trackFeatureEvent("payments", "trial_countdown_dismissed", {
      attributes: { days_left: daysLeft },
    });
    try {
      localStorage.setItem(dismissedKey(user.user_id), todayStr());
    } catch {
      /* noop */
    }
    setDismissedToday(true);
  };

  if (!shouldShow) return null;

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
          onClick={dismissToday}
          className="absolute top-2.5 right-2.5 size-7 rounded-full bg-black/25 text-white flex items-center justify-center cursor-pointer hover:bg-black/40 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="self-stretch flex flex-col items-center gap-6">
          <div className="self-stretch relative flex flex-col items-center gap-3">
            <div className="flex items-center justify-center">
              <div className="size-24 bg-blue-100 rounded-[58.54px] overflow-hidden shrink-0">
                <img
                  src={mayaSad}
                  alt="Maya sad the trial is ending"
                  className="w-full h-full object-cover"
                />
              </div>
              <img
                src={timerImg}
                alt=""
                className="absolute top-11 right-24 w-13 h-13 object-contain"
              />
            </div>

            <div className="self-stretch flex flex-col items-center gap-7">
              <div className="self-stretch flex flex-col items-center gap-3">
                <h2 className="self-stretch text-center text-[#002856] text-2xl font-bold leading-8">
                  {daysLeft >= 1
                    ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your Premium Trial`
                    : "Your Premium Trial expires today"}
                </h2>
                <p className="w-64 text-center text-[#002856] text-xs font-normal leading-5">
                  Upgrade before trial ends to continue learning without limits.
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
              onClick={() => {
                trackFeatureEvent("payments", "trial_countdown_upgrade_clicked", {
                  attributes: { days_left: daysLeft },
                });
                dismissToday();
                navigate("/profile/upgrade");
              }}
              whileTap={{ scale: 0.985 }}
              className="self-stretch px-4 py-3 bg-[#002856] hover:bg-[#001f42] active:bg-[#001f42] rounded-lg shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)] outline-offset-[-2px] outline-white/10 inline-flex justify-center items-center gap-1.5 overflow-hidden text-white text-base font-semibold cursor-pointer transition-colors"
            >
              <Gem className="w-5 h-5 text-amber-300" />
              <span>Upgrade to Premium</span>
            </motion.button>
            <a
              href="tel:+919731462667"
              className="self-stretch px-4 py-3 rounded-lg inline-flex justify-center items-center gap-1.5 text-[#002856] text-base font-semibold hover:bg-slate-50 transition-colors"
            >
              <Phone className="w-4 h-4 text-[#002856]" />
              <span>Talk to an expert</span>
            </a>
            <p className="w-72 text-center text-[#002856]/50 text-xs font-medium -mt-2">
              You can cancel it anytime.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
