import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Gem, Loader2, Lock, Phone, X } from "lucide-react";
import toast from "react-hot-toast";
import { setUser } from "../redux/auth/authSlice";
import { getMayaImage } from "../utils/mayaAvatars";
import mayaSad from "../assets/onboarding/mayaSad.webp";
import timerImg from "../assets/timer.webp";
import { useAutopayCheckout } from "../hooks/useAutopayCheckout";
import { useUsageLimits } from "../hooks/useUsageLimits";
import { getSubscriptionPlans, changePlan } from "../api/subscriptionApi";
import { mayaFeatureValue } from "../utils/premium";
import { switchLGMode } from "../utils/lgMode";
import { trackFeatureEvent } from "../telemetry/events";
import PremiumActivatedModal from "./PremiumActivatedModal";

const rupees = (paise) => Math.round((paise || 0) / 100);

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
  // Plans offered to this learner, fetched when a Maya lock opens the modal —
  // B2 learners get Standard + Plus; everyone else just Standard.
  const [plansData, setPlansData] = useState(null);
  const [pickedPlan, setPickedPlan] = useState("standard");
  const [upgrading, setUpgrading] = useState(false);
  // UPI instant upgrade: Razorpay's sheet only shows the plan price — the
  // refund breakdown needs our own confirmation step before checkout opens.
  const [upgradeConfirm, setUpgradeConfirm] = useState(null);

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
    // them right back into the same locked screen. The same now applies to
    // German Classes ("courses" persists via the mode switcher) — switch
    // both to practice first, so "/" actually sticks.
    if (event?.module_key === "learn_german" || event?.module_key === "video_courses") {
      switchLGMode("practice");
    }
    close();
    navigate("/");
  };

  // Celebrate a finished upgrade — the modal overlays this one, then its
  // dismiss/Goto-home also closes the lock view and refetches limits.
  const [successData, setSuccessData] = useState(null);
  const { loading, handlePay, handleInstantUpgrade } = useAutopayCheckout({
    user,
    dispatch,
    onSuccess: (data) => {
      // upgrade_processing = charge captured, webhook still promoting — the
      // toast already told them; just refresh, don't celebrate yet.
      if (data?.processing) {
        close();
        refresh();
        return;
      }
      setSuccessData(data || {});
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
    handlePay(pickedPlan);
  };

  const openUpgradeConfirm = (confirm) => {
    trackFeatureEvent("payments", "upgrade_confirm_presented", {
      entityId: "b2_plus",
      attributes: {
        surface: "usage_limit_modal",
        charge_paise: confirm?.chargePaise ?? 0,
        refund_paise: confirm?.refundPaise ?? 0,
      },
    });
    setUpgradeConfirm(confirm);
  };

  const closeUpgradeConfirm = (outcome) => {
    trackFeatureEvent("payments", `upgrade_confirm_${outcome}`, {
      entityId: "b2_plus",
      attributes: {
        surface: "usage_limit_modal",
        charge_paise: upgradeConfirm?.chargePaise ?? 0,
        refund_paise: upgradeConfirm?.refundPaise ?? 0,
      },
    });
    setUpgradeConfirm(null);
  };

  // In-place plan switch on the existing mandate — the webhook applies it, so
  // success here means "request accepted", not "already Plus".
  const upgradeToPlus = async () => {
    trackFeatureEvent("payments", "upgrade_clicked", {
      entityId: "b2_plus",
      attributes: { surface: "usage_limit_modal" },
    });
    setUpgrading(true);
    try {
      const res = await changePlan("b2_plus");
      if (res.user) dispatch(setUser(res.user));
      toast.success(
        res.status === "scheduled"
          ? res.msg || "Plus starts on your next billing date"
          : res.msg || "Charging just the difference — Plus activates in a moment"
      );
      close();
    } catch (err) {
      // Fixed-amount (UPI) mandates can't switch in place — show the
      // charge/refund breakdown, then run the instant upgrade.
      if (err?.response?.data?.code === "upi_plan_change") {
        openUpgradeConfirm({
          chargePaise: err.response.data.charge_amount_paise,
          refundPaise: err.response.data.refund_estimate_paise,
        });
      } else {
        toast.error(err?.response?.data?.msg || "Couldn't switch plans — try again");
      }
    } finally {
      setUpgrading(false);
    }
  };

  // "daily_limit" is a pool-empty 402 from /start on a paid plan — same event
  // pipe as the hard lock, but no countdown (the pool refills over the rolling
  // day) and the upgrade path is Plus, not a "Premium" they already have.
  const isMayaDailyLimit = event?.module_key === "maya" && event?.lock_reason === "daily_limit";
  const plusPlan = plansData?.plans?.find((p) => p.key === "b2_plus") || null;
  // Only 'active'/'authenticated' subs can be plan-changed; cancelled-but-paid
  // users keep their Standard tier but need a fresh mandate like everyone
  // else without one (trial/is_paid).
  const subIsLive = ["active", "authenticated"].includes(
    String(user?.autopay_status || "").toLowerCase()
  );
  const plusDirectCheckout = Boolean(
    plusPlan &&
      plansData &&
      (!plansData.current || (plansData.current === "standard" && !subIsLive))
  );
  const plusInPlaceUpgrade = Boolean(plansData?.current === "standard" && subIsLive);

  useEffect(() => {
    // A plan picked on a previous lock must not leak into the next event —
    // "Subscribe ₹99" on a flashcard limit can't silently become a ₹199 sale.
    setPickedPlan("standard");
    if (event?.module_key !== "maya") return;
    getSubscriptionPlans()
      .then((d) => setPlansData(d))
      .catch(() => setPlansData({ plans: [], current: null }));
  }, [event]);

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

  // daily_limit also ships limit_value 0, but it means "pool empty on a paid
  // plan", not "premium feature" — it gets its own copy and upgrade path.
  const isHardLocked = event.limit_value === 0 && !isMayaDailyLimit;
  const showCountdown = !isHardLocked && !isMayaDailyLimit && !expired;
  const mayaPlans = event.module_key === "maya" ? plansData?.plans || [] : [];
  const showPlanPicker = isHardLocked && mayaPlans.length > 1;
  const mayaRowValue = mayaFeatureValue(
    user,
    mayaPlans.find((p) => p.key === pickedPlan)?.mayaMinutesPerDay,
  );

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
        className="w-full max-w-[390px] bg-white rounded-3xl px-6 pt-10 pb-6 relative flex flex-col items-start gap-2.5 max-h-[92dvh] overflow-y-auto no-scrollbar"
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
                  src={
                    isHardLocked || expired
                      ? getMayaImage("looking", user?.occupation)
                      : mayaSad
                  }
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
                {isMayaDailyLimit
                  ? event.limit_window === "trial"
                    ? "That's all your Maya trial minutes"
                    : "That's your Maya time for today"
                  : isHardLocked
                    ? "Subscribe to Premium Plan for access"
                    : expired
                      ? "You're free to continue!"
                      : `You have reached ${lockedPeriodPhrase(event.periods)} free limit`}
              </h2>

              {isMayaDailyLimit ? (
                <p className="w-64 text-center text-[#002856] text-xs font-normal leading-relaxed">
                  {event.msg || "Your daily minutes are used up — the pool refills as the day rolls on."}
                </p>
              ) : showCountdown ? (
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
                continue" state) so the flow stays celebratory. For Maya's
                daily_limit the pitch is the Plus upgrade instead. */}
            {!expired && isMayaDailyLimit ? (
              // A Plus user already owns this plan — showing the card pitches
              // them their own tier.
              plusPlan && plansData?.current !== "b2_plus" ? (
                <div className="self-stretch flex flex-col items-center">
                  <div className="self-stretch px-1.5 py-1 bg-gradient-to-r from-[#002856] to-blue-700 rounded-tl-xl rounded-tr-xl inline-flex justify-center items-center gap-2">
                    <Gem className="w-3.5 h-3.5 text-amber-300" />
                    <span className="text-white text-xs font-normal">
                      Plus Plan
                    </span>
                  </div>
                  <div className="self-stretch px-4 pt-2.5 pb-4 bg-black/5 rounded-bl-xl rounded-br-xl flex flex-col items-center gap-4">
                    <div className="text-center">
                      <span className="text-[#002856] text-4xl font-bold">₹{rupees(plusPlan.amountPaise)} </span>
                      <span className="text-[#002856] text-base font-normal">/ month</span>
                    </div>
                    <div className="self-stretch border-t border-stone-300" />
                    <div className="self-stretch inline-flex justify-between items-center">
                      <span className="text-[#002856] text-xs font-normal">Talk to Maya</span>
                      <span className="inline-flex justify-start items-center gap-2">
                        <span className="text-[#002856] text-xs font-medium">
                          {plusPlan.mayaMinutesPerDay} min/day
                        </span>
                        <span className="size-2.5 bg-green-600 rounded-full flex items-center justify-center">
                          <Check className="text-white size-[90%]" />
                        </span>
                      </span>
                    </div>
                    {plusInPlaceUpgrade && (
                      <p className="w-64 text-center text-[#002856]/60 text-[11px] font-normal leading-relaxed">
                        {user?.autopay_method === "upi"
                          ? `You're on Standard — pay ₹${rupees(plusPlan.amountPaise)} once, your unused days come straight back, and Plus activates instantly.`
                          : "You're on Standard — upgrade in one tap and only pay the difference for this cycle."}
                      </p>
                    )}
                  </div>
                </div>
              ) : null
            ) : !expired &&
              (isHardLocked ? (
                <div className="self-stretch p-4 bg-black/5 rounded-xl flex flex-col items-start gap-4">
                  {showPlanPicker ? (
                    // Segmented toggle — the Maya pool is the only real
                    // difference between the plans, so it sits on each segment.
                    <div className="self-stretch flex gap-1 rounded-full bg-black/5 p-1" role="radiogroup" aria-label="Choose a plan">
                      {mayaPlans.map((p) => {
                        const active = pickedPlan === p.key;
                        const plus = p.key === "b2_plus";
                        return (
                          <motion.button
                            key={p.key}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setPickedPlan(p.key)}
                            variants={{ off: { scale: 1 }, on: { scale: [1, 1.06, 1] } }}
                            animate={active ? "on" : "off"}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            whileTap={{ scale: 0.96 }}
                            className={`flex-1 rounded-full px-3 py-1.5 text-center cursor-pointer transition-colors ${
                              active
                                ? plus
                                  ? "bg-[#002856] ring-1 ring-[#edb843]/70 shadow-[0_2px_12px_rgba(237,184,67,0.45)]"
                                  : "bg-[#002856] shadow-[0_2px_10px_rgba(0,40,86,0.45)]"
                                : "bg-transparent"
                            }`}
                          >
                            <span className={`flex items-center justify-center gap-1 text-[13px] font-semibold leading-5 ${active ? "text-white" : "text-[#002856]/50"}`}>
                              {plus && <Gem className={`size-3 ${active ? "text-amber-300" : "text-[#002856]/35"}`} />}
                              {p.label} ₹{rupees(p.amountPaise)}
                            </span>
                            <span className={`block text-[10px] leading-4 ${active ? "text-white/70" : "text-[#002856]/40"}`}>
                              Maya {p.mayaMinutesPerDay} min/day
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : (
                    <PriceRow />
                  )}
                  <div className="self-stretch border-t border-stone-300" />
                  <FeatureRows mayaValue={mayaRowValue} />
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
                    <FeatureRows mayaValue={mayaRowValue} />
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
            ) : isMayaDailyLimit ? (
              <>
                {/* Already-paying users: "Upgrade to Premium" is a dead end —
                    the upgrade here is Plus. Live Standard subs swap in place;
                    trial/is_paid/cancelled users buy a fresh subscription. */}
                {plusDirectCheckout && (
                  <motion.button
                    onClick={() => handlePay("b2_plus")}
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
                          Get Plus — ₹{rupees(plusPlan.amountPaise)}/month
                        </span>
                      </>
                    )}
                  </motion.button>
                )}
                {plusInPlaceUpgrade && (
                  <motion.button
                    type="button"
                    onClick={upgradeToPlus}
                    disabled={upgrading}
                    whileTap={{ scale: 0.985 }}
                    className="self-stretch px-4 py-3 bg-[#002856] hover:bg-[#001f42] rounded-lg inline-flex justify-center items-center gap-1.5 text-white text-base font-semibold cursor-pointer transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {upgrading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                    ) : (
                      <>
                        <Gem className="w-5 h-5 text-amber-300" />
                        <span>{user?.autopay_method === "upi" ? "Upgrade to Plus — instant activation" : "Upgrade to Plus — pay only the difference"}</span>
                      </>
                    )}
                  </motion.button>
                )}
                <button
                  type="button"
                  onClick={close}
                  className="self-stretch px-4 py-3 rounded-lg inline-flex justify-center items-center text-[#002856] text-base font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Not now
                </button>
              </>
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

        {/* Instant upgrade — refund breakdown before the checkout sheet */}
        {upgradeConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-10 bg-white rounded-3xl px-6 py-6 flex flex-col items-center justify-center gap-4"
          >
            <div className="size-24 bg-blue-100 rounded-full overflow-hidden relative shrink-0">
              <img
                src={getMayaImage("thumbsup", user)}
                alt="Maya approving the upgrade"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col items-center gap-1">
              <h3 className="text-2xl font-bold text-[#002856] text-center">
                Upgrade to Plus
              </h3>
              <p className="text-[#002856]/60 text-xs font-normal text-center leading-relaxed">
                One UPI payment. Plus activates instantly.
              </p>
            </div>

            <div className="w-full bg-slate-50 rounded-2xl p-4 flex flex-col gap-2.5 text-xs font-medium text-slate-600">
              <div className="flex justify-between items-baseline gap-3">
                <span className="min-w-0">Pay now, new Plus cycle</span>
                <span className="shrink-0 text-right text-[#002856] font-semibold">₹{rupees(upgradeConfirm.chargePaise ?? plusPlan?.amountPaise ?? 19900)}</span>
              </div>
              {upgradeConfirm.refundPaise > 0 && (
                <div className="flex justify-between items-baseline gap-3 text-emerald-700">
                  <span className="min-w-0">Unused Standard days back</span>
                  <span className="shrink-0 text-right font-semibold">₹{rupees(upgradeConfirm.refundPaise)}</span>
                </div>
              )}
              <div className="w-full border-t border-slate-200" />
              <div className="flex justify-between items-baseline gap-3 text-sm text-[#002856] font-bold">
                <span className="min-w-0">You effectively pay</span>
                <span className="shrink-0 text-right">₹{rupees(Math.max(0, (upgradeConfirm.chargePaise ?? plusPlan?.amountPaise ?? 19900) - (upgradeConfirm.refundPaise || 0)))}</span>
              </div>
              {upgradeConfirm.refundPaise > 0 && (
                <p className="text-slate-400 font-normal leading-relaxed">
                  The refund lands in your UPI automatically after payment.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={() => {
                  closeUpgradeConfirm("confirmed");
                  handleInstantUpgrade("b2_plus");
                }}
                className="w-full py-3.5 bg-[#002856] hover:bg-[#001e40] text-white rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                Pay ₹{rupees(upgradeConfirm.chargePaise ?? plusPlan?.amountPaise ?? 19900)}
              </button>
              <button
                onClick={() => closeUpgradeConfirm("dismissed")}
                className="w-full text-center text-slate-400 hover:text-slate-600 font-medium text-xs cursor-pointer py-1.5"
              >
                Not now
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Post-payment celebration; dismissing also closes the lock view. */}
      <PremiumActivatedModal
        open={Boolean(successData)}
        title={successData?.upgraded ? "Plus activated!" : "Premium activated!"}
        refundPaise={successData?.refunded_paise}
        mayaValue={
          successData &&
          mayaFeatureValue(
            user,
            successData.upgraded
              ? mayaPlans.find((p) => p.key === "b2_plus")?.mayaMinutesPerDay ?? 30
              : mayaPlans.find((p) => p.key === pickedPlan)?.mayaMinutesPerDay,
          )
        }
        onClose={() => {
          setSuccessData(null);
          close();
          refresh();
        }}
        onGoHome={() => {
          setSuccessData(null);
          close();
          refresh();
          navigate("/");
        }}
      />
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

function FeatureRows({ mayaValue }) {
  const rows = mayaValue
    ? [
        { label: "Talk to Maya", value: mayaValue },
        ...PREMIUM_FEATURES.map((label) => ({ label, value: "Unlimited" })),
      ]
    : PREMIUM_FEATURES.map((label) => ({ label, value: "Unlimited" }));
  return (
    <div className="self-stretch flex flex-col items-start gap-1">
      {rows.map(({ label, value }) => (
        <div
          key={label}
          className="self-stretch inline-flex justify-between items-center"
        >
          <span className="text-[#002856] text-xs font-normal">{label}</span>
          <span className="inline-flex justify-start items-center gap-2">
            <span className="text-[#002856] text-xs font-medium">{value}</span>
            <span className="size-2.5 bg-green-600 rounded-full flex items-center justify-center">
              <Check className="text-white size-[90%]" />
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
