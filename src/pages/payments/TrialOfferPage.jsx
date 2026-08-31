import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { Check, Gem, Loader2 } from "lucide-react";
import api from "../../api/axios";
import { setUser } from "../../redux/auth/authSlice";
import mayaWave from "../../assets/onboarding/mayaWave.webp";
import trialBadge from "../../assets/trial.webp";
import { isPremiumUser, hasTakenTrial } from "../../utils/premium";

const PREMIUM_FEATURES = [
  "Streak Challenges",
  "German Lessons",
  "Flashcards",
  "Pronunciation practice",
  "Exam practice",
];

// Dark navy feature rows used on the [#002856] trial screens.
function DarkFeatureRows() {
  return (
    <div className="self-stretch flex flex-col items-start gap-1">
      {PREMIUM_FEATURES.map((feature) => (
        <div
          key={feature}
          className="self-stretch inline-flex justify-between items-center"
        >
          <span className="text-center text-white text-sm font-normal">
            {feature}
          </span>
          <span className="flex justify-start items-center gap-2">
            <span className="text-center text-white text-sm font-medium">
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

export default function TrialOfferPage() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const from = useMemo(
    () =>
      typeof location.state?.from === "string" ? location.state.from : "/",
    [location.state],
  );
  const level = String(user?.user_prof_level || "A1").toUpperCase();

  // Guard: the offer is only for logged-in users who haven't claimed their
  // one trial — everyone else gets routed to where they were actually going.
  // Once the user just claimed the trial (started === true) the new user
  // payload has trial_taken = true, so the redirects below are skipped and
  // the "congratulations" step is allowed to render.
  useEffect(() => {
    if (started) return;
    if (!user) {
      navigate("/", { replace: true });
      return;
    }
    if (isPremiumUser(user)) {
      navigate("/profile/manage-plan", { replace: true });
      return;
    }
    if (hasTakenTrial(user)) {
      navigate("/profile/upgrade", { replace: true });
    }
  }, [user, navigate, started]);

  if (!started && (!user || isPremiumUser(user) || hasTakenTrial(user))) {
    return null;
  }

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/user/start-trial");
      dispatch(setUser(data.user));
      setStarted(true);
    } catch (err) {
      console.error("Start trial error:", err);
      alert(
        err.response?.data?.msg ||
          "Failed to start free trial. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const goLater = () => {
    // Record explicit trial skip to backend for permanent audit reporting (best-effort, non-blocking)
    api
      .post("/user/skip-trial")
      .then(({ data }) => {
        if (data?.user) {
          dispatch(setUser(data.user));
        }
      })
      .catch((err) => {
        console.error("Skip trial recording error:", err);
      });

    const targetDestination =
      from && from !== "/profile/upgrade" && from !== "/trial-offer"
        ? from
        : "/";

    navigate(targetDestination, { replace: true });
  };

  return (
    <div className="min-h-screen w-full bg-[#002856] flex flex-col items-center overflow-hidden select-none">
      <div className="w-full max-w-md px-4 pt-10 pb-8 flex flex-col items-center gap-10">
        {started ? (
          <>
            <div className="self-stretch flex flex-col items-center gap-9">
              <div className="flex justify-center">
                <div className="size-36 rounded-3xl overflow-hidden">
                  <img
                    src={trialBadge}
                    alt="7 day free trial"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="self-stretch flex flex-col items-center gap-12">
                <div className="self-stretch flex flex-col items-center gap-3">
                  <h1 className="w-72 text-center text-white text-2xl font-bold leading-8">
                    Congratulations! Your 7-day trial has started
                  </h1>
                  <p className="w-64 text-center text-white text-xs font-normal leading-5">
                    You now have unlimited access to all premium features for 7
                    days.
                  </p>
                </div>
                <div className="self-stretch flex flex-col items-center">
                  <div className="self-stretch px-1.5 pt-1 pb-2 bg-black/60 rounded-tl-xl rounded-tr-xl inline-flex justify-center items-center gap-2">
                    <Gem className="w-4 h-4 text-amber-300" />
                    <span className="text-center text-white text-xs font-normal">
                      Premium Plan features
                    </span>
                  </div>
                  <div className="self-stretch px-4 pt-2.5 pb-4 bg-black/30 rounded-bl-xl rounded-br-xl flex flex-col justify-center items-center gap-8">
                    <DarkFeatureRows />
                  </div>
                </div>
              </div>
            </div>
            <div className="self-stretch flex flex-col justify-center items-center gap-9">
              <div className="self-stretch flex flex-col items-start gap-2">
                <motion.button
                  type="button"
                  onClick={() => navigate("/", { replace: true })}
                  whileTap={{ scale: 0.985 }}
                  className="self-stretch px-4 py-3 bg-linear-to-r from-amber-300 to-amber-400 rounded-lg inline-flex justify-center items-center gap-1.5 overflow-hidden text-[#002856] text-base font-semibold cursor-pointer transition-colors"
                >
                  Let's go
                </motion.button>
              </div>
              <p className="w-72 text-center text-white/50 text-xs font-medium">
                Cancel anytime. No charges during trial
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Trial offer (figma 2) */}
            <div className="self-stretch flex flex-col items-center gap-9">
              <div className="flex justify-center">
                <div className="w-50 h-32 relative">
                  <div className="absolute size-32 bg-blue-100 rounded-[88px] overflow-hidden shrink-0">
                    <img
                      src={mayaWave}
                      alt="Maya waving"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <img
                    src={trialBadge}
                    alt="7 day free trial"
                    className="absolute -right-8 -bottom-1 size-32 object-cover rounded-2xl"
                  />
                </div>
              </div>
              <div className="self-stretch flex flex-col items-center gap-12">
                <div className="self-stretch flex flex-col items-center gap-3">
                  <h1 className="w-72 text-center text-white text-2xl font-bold leading-8">
                    Welcome to {level} German level!
                  </h1>
                  <p className="w-64 text-center text-white text-xs font-normal leading-5">
                    Start your 7-day Premium Trial and get full access to all
                    features.
                  </p>
                </div>
                <div className="self-stretch flex flex-col items-center">
                  <div className="self-stretch px-1.5 pt-1 pb-2 bg-black/60 rounded-tl-xl rounded-tr-xl inline-flex justify-center items-center gap-2">
                    <Gem className="w-4 h-4 text-amber-300" />
                    <span className="text-center text-white text-sm font-normal">
                      Premium Plan features
                    </span>
                  </div>
                  <div className="self-stretch px-4 pt-2.5 pb-4 bg-black/30 rounded-bl-xl rounded-br-xl flex flex-col justify-center items-center gap-4">
                    <DarkFeatureRows />
                  </div>
                </div>
              </div>
            </div>
            <div className="self-stretch flex flex-col justify-center items-center gap-2">
              <div className="self-stretch flex flex-col items-start gap-2">
                <motion.button
                  type="button"
                  onClick={handleStartTrial}
                  disabled={loading}
                  whileTap={{ scale: 0.985 }}
                  className="self-stretch px-4 py-3 bg-linear-to-r from-amber-300 to-amber-400 rounded-lg outline-offset-[-2px] outline-white/10 inline-flex justify-center items-center gap-1.5 overflow-hidden text-[#002856] text-base font-semibold cursor-pointer transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#002856]" />
                  ) : (
                    "Start 7-Day Free Trial"
                  )}
                </motion.button>
                <button
                  type="button"
                  onClick={goLater}
                  className="self-stretch px-4 py-3 rounded-lg inline-flex justify-center items-center text-white text-base font-semibold cursor-pointer transition-colors hover:bg-white/5"
                >
                  Maybe later
                </button>
              </div>
              <p className="w-72 text-center text-white/50 text-xs font-medium">
                Cancel anytime. No charges during trial
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
