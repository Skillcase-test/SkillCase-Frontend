import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Phone, Lock, Clock, X } from "lucide-react";
import mayaLooking from "../assets/onboarding/mayaLooking.webp";
import { useAutopayCheckout } from "../hooks/useAutopayCheckout";
import { useUsageLimits } from "../hooks/useUsageLimits";
import { switchLGMode } from "../utils/lgMode";

function formatCountdown(resetAt) {
  const ms = new Date(resetAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "0:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return days > 0 ? `${days}d ${clock}` : clock;
}

// A module can be locked by day, week, and month at once, but the countdown
// shown always targets whichever one unlocks last (see resolveModuleState's
// resetAt) — so name only that one period, not every period that happens to
// also be locked. Naming all of them read as noise ("today's and this
// week's limit") when only one number is actually being counted down.
const PERIOD_HIT_LABEL = { day: "today's", week: "this week's", month: "this month's" };
function lockedPeriodPhrase(periods) {
  const locked = (periods || []).filter((p) => p.locked && p.locked_until);
  if (!locked.length) return "your";
  const primary = locked.reduce((latest, p) =>
    new Date(p.locked_until) > new Date(latest.locked_until) ? p : latest,
  );
  return PERIOD_HIT_LABEL[primary.period] || "your";
}

export default function UsageLimitModal() {
  const [event, setEvent] = useState(null);
  const [expired, setExpired] = useState(false);
  const [now, setNow] = useState(Date.now());
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { refresh } = useUsageLimits();

  const close = () => {
    setEvent(null);
    setExpired(false);
  };

  // Leaving a still-locked feature should drop the user back on the home
  // hub, not leave them stranded on a screen they can no longer use.
  const leaveLocked = () => {
    // Learn German is special: "/" redirects straight back to
    // "/learn-german" for anyone whose saved preference is still "learn"
    // (see LandingPage.jsx's prefersLearnMode effect), which would bounce
    // them right back into the same locked screen. Switch their mode to
    // practice first — the same thing tapping "Practice" on the bottom
    // switcher does — so "/" actually sticks.
    if (event?.module_key === "learn_german") {
      switchLGMode("practice");
    }
    close();
    navigate("/");
  };

  const { loading, handlePay } = useAutopayCheckout({
    user,
    dispatch,
    onSuccess: () => {
      close();
      refresh();
    },
  });

  useEffect(() => {
    const onUsageLimitHit = (e) => {
      setExpired(false);
      setEvent(e.detail || null);
    };
    window.addEventListener("skillcase:usage-limit", onUsageLimitHit);
    return () => window.removeEventListener("skillcase:usage-limit", onUsageLimitHit);
  }, []);

  useEffect(() => {
    if (!event || !event.reset_at) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [event]);

  useEffect(() => {
    if (!event?.reset_at) return;
    if (new Date(event.reset_at).getTime() - now <= 0) setExpired(true);
  }, [now, event]);

  // The countdown reaching zero only updates this modal's own local state —
  // the shared usage-limit context (which the home hub's feature tiles read
  // to decide whether they're clickable) stays stale until refetched.
  // Without this, "Wait it out" -> countdown ends -> "Continue" still left
  // the tile locked until a hard refresh.
  useEffect(() => {
    if (expired) refresh();
  }, [expired, refresh]);

  if (!event) return null;

  const isHardLocked = event.limit_value === 0;

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center p-4 backdrop-blur-xs select-none font-sans"
      style={{
        background:
          "radial-gradient(circle, rgba(15, 23, 42, 0.65) 0%, rgba(2, 6, 23, 0.95) 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-[390px] bg-white border border-slate-100 rounded-[32px] shadow-2xl py-6 sm:py-8 px-4 sm:px-6 flex flex-col items-center gap-5 sm:gap-6 relative"
      >
        {!isHardLocked && expired && (
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="w-20 h-20 rounded-full shadow-sm bg-[#a2c5f2] overflow-hidden flex items-center justify-center shrink-0">
          <img src={mayaLooking} alt="Maya mascot looking" className="w-full h-full object-cover" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 bg-slate-100 rounded-full">
          <Lock className="w-3 h-3 text-slate-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {isHardLocked ? "Feature locked" : "Limit reached"}
          </span>
        </div>

        <h2 className="text-2xl sm:text-[26px] font-bold text-[#002856] text-center leading-tight tracking-tight px-1">
          {isHardLocked
            ? "This feature is subscriber-only"
            : expired
              ? "You're free to continue!"
              : `You've hit ${lockedPeriodPhrase(event.periods)} free limit`}
        </h2>

        {!isHardLocked && (
          <div className="w-full bg-[#f8f9fa] rounded-3xl p-4 sm:p-5 flex flex-col gap-3 items-center">
            {expired ? (
              <p className="text-xs text-slate-500 text-center">
                Your limit has reset — go ahead and keep practicing.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2 text-[#002856]">
                  <Clock className="w-5 h-5" />
                  <span className="text-2xl font-extrabold tabular-nums">
                    {formatCountdown(event.reset_at)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold text-center">
                  until this feature is free again — or subscribe now for unlimited access.
                </p>
              </>
            )}
          </div>
        )}

        {isHardLocked && (
          <p className="text-xs text-slate-500 text-center px-2">
            {event.msg || "Subscribe to unlock this feature, or keep using the rest of the app for free."}
          </p>
        )}

        <div className="flex flex-col gap-3 w-full">
          {(!expired || isHardLocked) && (
            <motion.button
              onClick={handlePay}
              disabled={loading}
              whileTap={{ scale: 0.985 }}
              className="w-full h-12 sm:h-13 bg-[#002856] hover:bg-[#001f42] active:bg-[#001f42] text-white rounded-2xl transition-all disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center font-bold text-xs sm:text-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : "Subscribe for unlimited access"}
            </motion.button>
          )}
          <motion.button
            type="button"
            onClick={expired ? close : leaveLocked}
            whileTap={{ scale: 0.985 }}
            className="w-full h-12 sm:h-13 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 text-[#002856] cursor-pointer shadow-xs"
          >
            {isHardLocked ? "Keep using free features" : expired ? "Continue" : "Wait it out"}
          </motion.button>
          {isHardLocked && (
            <a
              href="tel:+919731462667"
              className="w-full h-10 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 hover:text-slate-600"
            >
              <Phone className="w-3.5 h-3.5" />
              Talk to an expert
            </a>
          )}
        </div>
      </motion.div>
    </div>
  );
}
