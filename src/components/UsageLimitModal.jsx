import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Gem, Loader2, Lock, Phone, X } from "lucide-react";
import mayaLooking from "../assets/onboarding/mayaLooking.webp";
import mayaSad from "../assets/onboarding/mayaSad.webp";
import timerImg from "../assets/timer.webp";
import { useAutopayCheckout } from "../hooks/useAutopayCheckout";
import { useUsageLimits } from "../hooks/useUsageLimits";
import { switchLGMode } from "../utils/lgMode";
import { trackFeatureEvent } from "../telemetry/events";

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
const PERIOD_HIT_LABEL = {
  day: "today's",
  week: "this week's",
  month: "this month's",
};
function lockedPeriodPhrase(periods) {
  const locked = (periods || []).filter((p) => p.locked && p.locked_until);
  if (!locked.length) return "your";
  const primary = locked.reduce((latest, p) =>
    new Date(p.locked_until) > new Date(latest.locked_until) ? p : latest,
  );
  return PERIOD_HIT_LABEL[primary.period] || "your";
}

const PREMIUM_FEATURES = [
  "Streak Challenges",
  "German Lessons",
  "Flashcards",
  "Pronunciation practice",
  "Exam practice",
];

export default function UsageLimitModal() {
  const [event, setEvent] = useState(null);
  const [expired, setExpired] = useState(false);
  const [now, setNow] = useState(Date.now());
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { refresh } = useUsageLimits();

  const close = () => {
    if (event?.module_key) {
      trackFeatureEvent("usage_limits", "modal_dismissed", {
        entityId: event.module_key,
        attributes: { level: event.level },
      });
    }
    setEvent(null);
    setExpired(false);
  };

  // Leaving a still-locked feature drops the user back on the home hub, not
  // stranded on a screen they can no longer use. The Figma only exposes the
  // X button for dismissal, and it behaves like the old "Wait it out" /
  // "Keep using free features" buttons.
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

  // A user who never took their one free trial gets the trial offer before
  // any payment flow — payment only opens once the trial is claimed or
  // skipped.
  const openUpgrade = () => {
    if (event?.module_key) {
      trackFeatureEvent("usage_limits", "upgrade_clicked", {
        entityId: event.module_key,
        attributes: { level: event.level },
      });
    }
    if (user && !user.trial_taken) {
      // Close first — the modal renders app-wide and would otherwise sit
      // on top of (and later X-navigate away from) the trial page.
      close();
      navigate("/trial-offer", { state: { from: "/" } });
      return;
    }
    handlePay();
  };

  useEffect(() => {
    const onUsageLimitHit = (e) => {
      setExpired(false);
      const detail = e.detail || null;
      setEvent(detail);
      if (detail?.module_key) {
        // reset_in_minutes rather than the raw reset_at timestamp: the telemetry
        // sanitizer treats "2026-08-17"-shaped digit runs as a phone number and
        // redacts them, and a relative number is the more useful metric anyway.
        const resetMs = detail.reset_at
          ? new Date(detail.reset_at).getTime() - Date.now()
          : NaN;
        trackFeatureEvent("usage_limits", "modal_presented", {
          entityId: detail.module_key,
          attributes: {
            level: detail.level,
            limit_value: detail.limit_value,
            reset_in_minutes: Number.isFinite(resetMs)
              ? Math.max(0, Math.round(resetMs / 60000))
              : null,
          },
        });
      }
    };
    window.addEventListener("skillcase:usage-limit", onUsageLimitHit);
    return () =>
      window.removeEventListener("skillcase:usage-limit", onUsageLimitHit);
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
  // Without this, waiting out the countdown still left the tile locked
  // until a hard refresh.
  useEffect(() => {
    if (expired) refresh();
  }, [expired, refresh]);

  if (!event) return null;

  const isHardLocked = event.limit_value === 0;
  const showCountdown = !isHardLocked && !expired;

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
        {/* Close — dismisses to the home hub while a feature is still locked */}
        <button
          type="button"
          aria-label="Close"
          onClick={expired ? close : leaveLocked}
          className="absolute top-2.5 right-2.5 size-7 rounded-full bg-black/25 text-white flex items-center justify-center cursor-pointer hover:bg-black/40 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="self-stretch flex flex-col items-center gap-6">
          <div className="self-stretch flex flex-col items-center gap-3">
            {/* Mascot — standing for premium, sad + hourglass for limit hit */}
            <div className="flex items-center justify-center">
              <div className="size-24 bg-blue-100 rounded-full overflow-hidden relative shrink-0">
                <img
                  src={isHardLocked || expired ? mayaLooking : mayaSad}
                  alt={
                    isHardLocked
                      ? "Maya presenting the premium plan"
                      : "Maya apologetic about the limit"
                  }
                  className="w-full h-full object-cover"
                />
              </div>
              {!isHardLocked && !expired && (
                <img
                  src={timerImg}
                  alt=""
                  className="absolute top-20 right-30 w-13 h-13 object-contain"
                />
              )}
            </div>

            {isHardLocked && (
              <div className="px-2 bg-yellow-100 rounded-[40px] inline-flex justify-center items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-yellow-600" />
                <span className="text-yellow-700 text-xs font-medium leading-5">
                  This is a premium feature
                </span>
              </div>
            )}

            <div className="self-stretch flex flex-col items-center gap-3">
              <h2 className="self-stretch text-center text-[#002856] text-2xl font-bold leading-tight tracking-tight">
                {isHardLocked
                  ? "Subscribe to Premium Plan for access"
                  : expired
                    ? "You're free to continue!"
                    : `You have reached ${lockedPeriodPhrase(event.periods)} free limit`}
              </h2>

              {showCountdown ? (
                <p className="w-64 text-center text-[#002856] text-xs font-normal leading-relaxed">
                  Come back in{" "}
                  <span className="font-semibold tabular-nums text-[#002856]">
                    {formatCountdown(event.reset_at)}
                  </span>{" "}
                  or upgrade to premium for unlimited usage.
                </p>
              ) : expired ? (
                <p className="w-64 text-center text-[#002856] text-xs font-normal leading-relaxed">
                  Your limit has reset — go ahead and keep practicing.
                </p>
              ) : null}
            </div>

            {/* Pricing card — hidden once the limit has reset (the "free to
                continue" state) so the flow stays celebratory */}
            {!expired &&
              (isHardLocked ? (
                <div className="self-stretch p-4 bg-black/5 rounded-xl flex flex-col items-start gap-4">
                  <PriceRow />
                  <div className="self-stretch border-t border-stone-300" />
                  <FeatureRows />
                </div>
              ) : (
                <div className="self-stretch flex flex-col items-center">
                  <div className="self-stretch px-1.5 py-1 bg-gradient-to-r from-[#002856] to-blue-700 rounded-tl-xl rounded-tr-xl inline-flex justify-center items-center gap-2">
                    <Gem className="w-3.5 h-3.5 text-amber-300" />
                    <span className="text-white text-xs font-normal">
                      Premium Plan
                    </span>
                  </div>
                  <div className="self-stretch px-4 pt-2.5 pb-4 bg-black/5 rounded-bl-xl rounded-br-xl flex flex-col items-center gap-4">
                    <PriceRow />
                    <div className="self-stretch border-t border-stone-300" />
                    <FeatureRows />
                  </div>
                </div>
              ))}
          </div>

          {/* Actions */}
          <div className="self-stretch flex flex-col items-center gap-2">
            {expired ? (
              <button
                type="button"
                onClick={close}
                className="self-stretch px-4 py-3 bg-[#002856] hover:bg-[#001f42] active:bg-[#001f42] rounded-lg inline-flex justify-center items-center text-white text-base font-semibold cursor-pointer transition-colors"
              >
                Continue
              </button>
            ) : (
              <>
                <motion.button
                  onClick={openUpgrade}
                  disabled={loading}
                  whileTap={{ scale: 0.985 }}
                  className="self-stretch px-4 py-3 bg-[#002856] hover:bg-[#001f42] active:bg-[#001f42] rounded-lg shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)] outline-offset-[-2px] outline-white/10 inline-flex justify-center items-center gap-1.5 overflow-hidden cursor-pointer transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  ) : (
                    <>
                      <Gem className="w-5 h-5 text-amber-300" />
                      <span className="text-white text-base font-semibold leading-6">
                        {isHardLocked ? "Unlock Premium" : "Upgrade to Premium"}
                      </span>
                    </>
                  )}
                </motion.button>
                <a
                  href="tel:+919731462667"
                  className="self-stretch px-4 py-3 rounded-lg outline-offset-[-1px] outline-zinc-400 inline-flex justify-center items-center gap-1.5 overflow-hidden text-[#002856] hover:bg-slate-50 transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#002856]" />
                  <span className="text-[#002856] text-base font-semibold leading-6">
                    Talk to an expert
                  </span>
                </a>
                <p className="w-72 text-center text-[#002856]/50 text-xs font-medium">
                  You can cancel it anytime.
                </p>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

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
          <span className="text-[#002856] text-xs font-normal">{feature}</span>
          <span className="inline-flex justify-start items-center gap-2">
            <span className="text-[#002856] text-xs font-medium">
              Unlimited
            </span>
            <span className="size-2.5 bg-green-600 rounded-full flex items-center justify-center">
              <Check className="text-white size-[90%]" />
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
