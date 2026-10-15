import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useGoBack } from "../../hooks/useGoBack";
import { useSelector, useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { ArrowLeft, PhoneCall, X, Loader2, Check, Gem } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { setUser } from "../../redux/auth/authSlice";
import { useAutopayCheckout } from "../../hooks/useAutopayCheckout";
import { getSubscriptionPlans, changePlan } from "../../api/subscriptionApi";
import mayaSad from "../../assets/onboarding/mayaSad.webp";
import { getMayaImage } from "../../utils/mayaAvatars";
import { canLearnerUpgradeToPro, isLearnerAccess, mayaFeatureValue, premiumPlanName } from "../../utils/premium";
import { PLAN_TROPHY } from "../../components/premium/PlanCards";
import PremiumActivatedModal from "../../components/PremiumActivatedModal";
import { trackFeatureEvent } from "../../telemetry/events";

const rupees = (paise) => Math.round((paise || 0) / 100);

const PREMIUM_FEATURES = [
  "Streak Challenges",
  "German Lessons",
  "Flashcards",
  "Pronunciation practice",
  "Exam practice",
];

const SUPPORT_PHONE = "+919731462667";

function formatBillingDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ManagePlanPage() {
  const navigate = useNavigate();
  const goBack = useGoBack("/profile");
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  // UPI instant upgrade: Razorpay's sheet only shows the plan price — the
  // refund breakdown needs our own confirmation step before checkout opens.
  const [upgradeConfirm, setUpgradeConfirm] = useState(null);
  // Celebrate a finished upgrade/subscribe — carries the refund amount the
  // verify response reports so the modal can say what's coming back.
  const [successData, setSuccessData] = useState(null);
  // Which catalog plan their access is on (null while loading → fall back to
  // the standard ₹99 labels the page always had).
  const [plansInfo, setPlansInfo] = useState(null);
  // A course learner buying Career Pro: the success modal must still say Pro
  // after the page flips to the subscriber view
  const [boughtPro, setBoughtPro] = useState(false);
  const { loading: resuming, handlePay, handleInstantUpgrade } = useAutopayCheckout({
    user,
    dispatch,
    onSuccess: (data) => {
      // upgrade_processing = charge captured, webhook still promoting — refresh,
      // don't celebrate yet.
      if (data?.processing) {
        getSubscriptionPlans().then(setPlansInfo).catch(() => {});
        return;
      }
      setSuccessData(data || {});
    },
  });

  useEffect(() => {
    getSubscriptionPlans()
      .then(setPlansInfo)
      .catch(() => setPlansInfo(null));
  }, []);

  // Course learners (paid by the team, no subscription) get a read-only view
  // plus the Career Pro upgrade; everyone else without autopay buys a plan
  const learner = isLearnerAccess(user);
  if (user?.autopay_enabled !== true && !learner) {
    return <Navigate to="/profile/upgrade" replace />;
  }

  // currentPlan survives a plan that isn't buyable for them anymore (level
  // moved off B2); plans[] only ever lists what they may purchase.
  const currentPlan = plansInfo?.currentPlan || plansInfo?.plans?.find((p) => p.key === plansInfo?.current) || null;
  const planName = premiumPlanName(user) || currentPlan?.label || "Premium";
  const planPrice = `₹${rupees(currentPlan?.amountPaise ?? 9900)}`;

  // 'active'/'authenticated' are the self-renewing states (an authenticated
  // mandate is live — a deferred-start sub sits there until first charge).
  // Cancelled/completed keep access until next_billing_at, and an abandoned
  // re-checkout ('created'/'pending') still owes that same end date — the paid
  // period belongs to the user; the renewal is what's gone.
  const isNonRenewable = !["active", "authenticated"].includes(
    String(user?.autopay_status || "").toLowerCase()
  );
  const accessUntil = formatBillingDate(user?.next_billing_at);

  const plusPlan = plansInfo?.plans?.find((p) => p.key === "b2_plus") || null;
  const currentMayaValue = mayaFeatureValue(
    user,
    plansInfo?.currentPlan?.mayaMinutesPerDay,
  );
  const pendingPlan = plansInfo?.pendingPlan || null;
  // Standard B2 users on a live subscription can switch plans in place — same
  // mandate, Razorpay prorates the difference. Razorpay updates only
  // 'active'/'authenticated' subs; anything else falls back to resubscribe.
  const subIsUpdatable = ["active", "authenticated"].includes(
    String(user?.autopay_status || "").toLowerCase()
  );
  const canMoveToPlus = Boolean(
    plusPlan && plansInfo?.current === "standard" && subIsUpdatable
  );
  // No ₹99 to credit back here: a fresh ₹199 autopay on top of their course access
  const learnerCanBuyPro = Boolean(plusPlan && canLearnerUpgradeToPro(user));

  const handleDisableAutopay = async () => {
    setCancelling(true);
    try {
      const res = await api.post("/user/disable-autopay");
      dispatch(setUser(res.data.user));
      toast.success("Subscription cancelled — you keep Premium until it ends");
      trackFeatureEvent("payments", "cancel_confirmed", {
        entityId: plansInfo?.current || user?.subscription_plan || undefined,
      });
      setShowCancel(false);
      getSubscriptionPlans().then(setPlansInfo).catch(() => {});
    } catch (err) {
      console.error("Cancel subscription error:", err);
      toast.error(err.response?.data?.msg || "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  const refreshPlans = () => getSubscriptionPlans().then(setPlansInfo).catch(() => {});

  const openUpgradeConfirm = (confirm) => {
    trackFeatureEvent("payments", "upgrade_confirm_presented", {
      entityId: "b2_plus",
      attributes: {
        surface: "manage_plan",
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
        surface: "manage_plan",
        charge_paise: upgradeConfirm?.chargePaise ?? 0,
        refund_paise: upgradeConfirm?.refundPaise ?? 0,
      },
    });
    setUpgradeConfirm(null);
  };

  const upgradeToPlus = async () => {
    trackFeatureEvent("payments", "upgrade_clicked", {
      entityId: "b2_plus",
      attributes: { surface: "manage_plan" },
    });
    setUpgrading(true);
    try {
      const res = await changePlan("b2_plus");
      if (res.user) dispatch(setUser(res.user));
      if (res.status === "scheduled") {
        toast.success(res.msg || "Career Pro starts on your next billing date");
        refreshPlans();
        return;
      }
      // 'activating' — the prorated top-up is charging on the mandate; the tier
      // only flips when the webhook confirms, so poll briefly for it.
      toast.success(res.msg || "Charging just the difference — activating Career Pro…");
      for (let i = 0; i < 6; i += 1) {
        await new Promise((r) => setTimeout(r, 2000));
        const me = await api
          .post("/user/me", null, { meta: { skipPaywallRefresh: true } })
          .catch(() => null);
        if (me?.data?.user?.subscription_plan === "b2_plus") {
          dispatch(setUser(me.data.user));
          toast.success("You're on Career Pro — 30 minutes of Maya a day");
          refreshPlans();
          return;
        }
      }
      toast("Still activating — check back in a minute");
      refreshPlans();
    } catch (err) {
      console.error("Change plan error:", err);
      // Fixed-amount (UPI) mandates can't switch in place — show the
      // charge/refund breakdown, then run the instant upgrade.
      if (err.response?.data?.code === "upi_plan_change") {
        openUpgradeConfirm({
          chargePaise: err.response.data.charge_amount_paise,
          refundPaise: err.response.data.refund_estimate_paise,
        });
      } else {
        toast.error(err.response?.data?.msg || "Couldn't switch plans — try again");
      }
      refreshPlans();
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-black to-premium-navy flex flex-col">
      {/* Header */}
      <div
        className="px-4 pb-2.5 flex items-center gap-3"
        style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top, 0px))" }}
      >
        <button
          onClick={goBack}
          className="size-7 flex items-center justify-center rounded-md border-2 border-white/40 text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-white text-base font-semibold">Manage Plan</h1>
      </div>

      <div className="px-4 pt-4 pb-10 flex flex-col gap-9">
        <div className="flex flex-col items-center gap-3">
          <img src={PLAN_TROPHY} alt="" aria-hidden="true" className="w-20 aspect-5/6 object-contain" />

          <div className="flex flex-col items-center gap-7 w-full">
            <div className="flex flex-col items-center gap-3">
              <h2 className="text-center text-white text-2xl font-bold">
                {planName} Active
              </h2>
              <p className="max-w-xs text-center text-white text-xs font-normal">
                {isNonRenewable && !learner
                  ? `Your plan won't renew. You keep full access${
                      accessUntil ? ` until ${accessUntil}` : ""
                    }.`
                  : `You have now access to all ${planName} features`}
              </p>
            </div>

            {/* What's included */}
            <div className="self-stretch p-4 bg-black/50 rounded-xl flex flex-col gap-4">
              <div className="text-gold-400 text-base font-normal">
                What's included
              </div>
              <div className="flex flex-col gap-1">
                {(currentMayaValue
                  ? [
                      { label: "Talk to Maya", value: currentMayaValue },
                      ...PREMIUM_FEATURES.map((label) => ({
                        label,
                        value: "Unlimited",
                      })),
                    ]
                  : PREMIUM_FEATURES.map((label) => ({
                      label,
                      value: "Unlimited",
                    }))
                ).map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between items-center"
                  >
                    <span className="text-white text-xs font-normal">
                      {label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-xs font-medium">
                        {value}
                      </span>
                      <span className="size-3 p-0.5 bg-gold-400 rounded-full flex">
                        <Check className="text-blue-950 size-full" strokeWidth={4} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Plan details */}
            {!learner && (
            <div className="self-stretch p-4 bg-black/50 rounded-xl flex flex-col gap-4">
              <div className="text-gold-400 text-base font-normal">
                Monthly Plan details
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-white text-xs font-normal">
                    {planName} membership fee
                  </span>
                  <span className="text-white text-xs font-normal">{planPrice}</span>
                </div>
                <div className="w-full h-0 border-t border-white/40" />
                <div className="flex justify-between items-center">
                  <span className="text-white text-xs font-semibold">
                    Total monthly amount
                  </span>
                  <span className="text-white text-xs font-semibold">{planPrice}</span>
                </div>
                {accessUntil && (
                  <>
                    <div className="w-full h-0 border-t border-white/40" />
                    <div className="flex justify-between items-center">
                      <span className="text-white text-xs font-normal">
                        {isNonRenewable ? "Access until" : "Next billing date"}
                      </span>
                      <span className="text-white text-xs font-normal">
                        {accessUntil}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            )}

            {learner ? (
              learnerCanBuyPro && (
                <button
                  onClick={() => {
                    trackFeatureEvent("payments", "upgrade_clicked", {
                      entityId: "b2_plus",
                      attributes: { surface: "manage_plan", kind: "learner" },
                    });
                    setBoughtPro(true);
                    handlePay("b2_plus");
                  }}
                  disabled={resuming}
                  className="self-stretch px-4 py-3 rounded-xl border border-gold-400/40 bg-white/10 text-left hover:bg-white/15 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  <span className="flex items-center gap-2 text-white text-sm font-semibold">
                    {resuming ? <Loader2 className="size-4 animate-spin text-gold-400" /> : <Gem className="size-4 text-gold-400" />}
                    Upgrade to Career Pro — ₹{rupees(plusPlan.amountPaise)}/mo
                  </span>
                  <span className="block text-white/60 text-[11px] mt-1 leading-snug">
                    {plusPlan.mayaMinutesPerDay} min of Maya a day with monthly UPI autopay. Your Career Plus course access stays as it is, and you can cancel anytime.
                  </span>
                </button>
              )
            ) : pendingPlan?.key === "b2_plus" && pendingPlan.unpaid ? (
              // An abandoned upgrade payment — nothing was charged and NOTHING
              // is scheduled, so this must offer to resume the payment, never
              // imply Plus is "coming" on its own.
              <button
                onClick={() => {
                  trackFeatureEvent("payments", "upgrade_resume_clicked", {
                    entityId: "b2_plus",
                    attributes: { surface: "manage_plan", kind: "unpaid" },
                  });
                  openUpgradeConfirm({
                    chargePaise: plusPlan?.amountPaise ?? 19900,
                    refundPaise: pendingPlan.refund_estimate_paise,
                  });
                }}
                className="self-stretch px-4 py-3 rounded-xl border border-gold-400/40 bg-white/10 text-left hover:bg-white/15 active:scale-[0.99] transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2 text-white text-sm font-semibold">
                  <Gem className="size-4 text-gold-400" />
                  Finish your Career Pro upgrade
                </span>
                <span className="block text-white/60 text-[11px] mt-1 leading-snug">
                  One ₹{rupees(plusPlan?.amountPaise ?? 19900)} payment activates Career Pro instantly
                  {pendingPlan.refund_estimate_paise > 0
                    ? ` and ₹${rupees(pendingPlan.refund_estimate_paise)} of unused Career Plus days comes back to your UPI`
                    : ""}
                  .
                </span>
              </button>
            ) : pendingPlan?.key === "b2_plus" ? (
              subIsUpdatable ? (
                <div className="self-stretch p-3 bg-white/10 rounded-xl border border-gold-400/40 flex items-center gap-2.5">
                  <Gem className="size-4 text-gold-400 shrink-0" />
                  <p className="text-white/70 text-xs font-normal leading-relaxed">
                    Career Pro starts on your next billing date{accessUntil ? ` (${accessUntil})` : ""} — {plusPlan?.mayaMinutesPerDay || 30} min of Maya a day, nothing extra charged today.
                  </p>
                </div>
              ) : (
                // A pending plan on a released sub means an abandoned
                // replacement checkout — let them finish the mandate. Routes
                // through the upgrade path so the pending sub is resumed, not
                // a second subscription created.
                <button
                  onClick={() => {
                    trackFeatureEvent("payments", "upgrade_resume_clicked", {
                      entityId: "b2_plus",
                      attributes: { surface: "manage_plan", kind: "deferred" },
                    });
                    handleInstantUpgrade("b2_plus");
                  }}
                  className="self-stretch px-4 py-3 rounded-xl border border-gold-400/40 bg-white/10 text-left hover:bg-white/15 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-white text-sm font-semibold">
                    <Gem className="size-4 text-gold-400" />
                    Finish setting up Career Pro
                  </span>
                  <span className="block text-white/60 text-[11px] mt-1 leading-snug">
                    {plansInfo?.current === "b2_plus"
                      ? "Career Pro is already active — finish the quick mandate setup to keep it renewing."
                      : "Your upgrade is waiting — complete the quick mandate setup and your Career Plus plan carries over until it activates."}
                  </span>
                </button>
              )
            ) : canMoveToPlus ? (
              <button
                onClick={upgradeToPlus}
                disabled={upgrading}
                className="self-stretch px-4 py-3 rounded-xl border border-gold-400/40 bg-white/10 text-left hover:bg-white/15 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              >
                <span className="flex items-center gap-2 text-white text-sm font-semibold">
                  {upgrading ? <Loader2 className="size-4 animate-spin text-gold-400" /> : <Gem className="size-4 text-gold-400" />}
                  Upgrade to Career Pro — ₹{rupees(plusPlan.amountPaise)}/mo
                </span>
                <span className="block text-white/60 text-[11px] mt-1 leading-snug">
                  {user?.autopay_method === "upi"
                    ? `${plusPlan.mayaMinutesPerDay} min of Maya a day. Pay ₹${rupees(plusPlan.amountPaise)} once and your unused Career Plus days come straight back to your UPI — Career Pro activates instantly.`
                    : `${plusPlan.mayaMinutesPerDay} min of Maya a day. You only pay the difference for the days left in this cycle — no new checkout needed.`}
                </span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3">
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="w-full px-4 py-3 bg-gold-400 rounded-lg text-blue-950 text-base font-semibold hover:bg-gold-300 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs inset-ring inset-ring-black/15"
          >
            <PhoneCall className="size-5 text-blue-950" />
            <span>Get priority support</span>
          </a>
          {learner ? null : isNonRenewable ? (
            <button
              // Resume on the same plan they paid for — a Plus user who cancelled
              // must not silently come back on Standard. The redux payload's
              // subscription_plan covers a failed /plans fetch.
              onClick={() => handlePay(plansInfo?.current || user?.subscription_plan || undefined)}
              disabled={resuming}
              className="w-full px-4 py-3 bg-white rounded-lg outline-1 outline-white text-blue-950 text-base font-semibold hover:bg-white/90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {resuming && <Loader2 className="size-4 animate-spin" />}
              Resume Premium
            </button>
          ) : (
            <button
              onClick={() => {
                trackFeatureEvent("payments", "cancel_modal_presented", {
                  entityId: plansInfo?.current || user?.subscription_plan || undefined,
                });
                setShowCancel(true);
              }}
              className="w-full px-4 py-3 bg-transparent rounded-lg outline-1 outline-zinc-400 text-white text-base font-semibold hover:bg-white/5 active:scale-[0.99] transition-all cursor-pointer"
            >
              Cancel Premium
            </button>
          )}
        </div>
      </div>

      {/* Instant upgrade — refund breakdown before the checkout sheet */}
      {upgradeConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none ">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-[390px] rounded-3xl shadow-2xl px-6 pt-8 pb-6 flex flex-col items-center gap-4 relative"
          >
            <button
              onClick={() => closeUpgradeConfirm("dismissed")}
              className="absolute top-3 right-3 size-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>

            <div className="size-24 bg-blue-100 rounded-full overflow-hidden relative shrink-0">
              <img
                src={getMayaImage("thumbsup", user)}
                alt="Maya approving the upgrade"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col items-center gap-1">
              <h3 className="text-2xl font-bold text-[#002856] text-center">
                Upgrade to Career Pro
              </h3>
              <p className="text-[#002856]/60 text-xs font-normal text-center leading-relaxed">
                One UPI payment. Career Pro activates instantly.
              </p>
            </div>

            <div className="w-full bg-slate-50 rounded-2xl p-4 flex flex-col gap-2.5 text-xs font-medium text-slate-600">
              <div className="flex justify-between items-baseline gap-3">
                <span className="min-w-0">Pay now, new Career Pro cycle</span>
                <span className="shrink-0 text-right text-[#002856] font-semibold">₹{rupees(upgradeConfirm.chargePaise ?? plusPlan?.amountPaise ?? 19900)}</span>
              </div>
              {upgradeConfirm.refundPaise > 0 && (
                <div className="flex justify-between items-baseline gap-3 text-emerald-700">
                  <span className="min-w-0">Unused Career Plus days back</span>
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
        </div>
      )}

      {/* Cancel Premium Confirmation Modal */}
      {showCancel && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none ">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-5 relative"
          >
            <button
              onClick={() => {
                trackFeatureEvent("payments", "cancel_modal_dismissed", {
                  entityId: plansInfo?.current || user?.subscription_plan || undefined,
                });
                setShowCancel(false);
              }}
              className="absolute top-4 right-4 size-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>

            <div className="size-20 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center shrink-0">
              <img
                src={mayaSad}
                alt="Premium"
                className="w-full h-full object-cover"
              />
            </div>

            <h3 className="text-xl font-bold text-[#002856] text-center">
              Please don't leave us
            </h3>

            <p className="text-slate-600  text-xs font-semibold leading-relaxed px-2 text-justify">
              You have covered a long way in your German journey. Cancelling
              stops the monthly renewal{accessUntil ? ` — you keep Premium until ${accessUntil}` : ""}.
            </p>

            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={() => {
                  trackFeatureEvent("payments", "cancel_modal_dismissed", {
                    entityId: plansInfo?.current || user?.subscription_plan || undefined,
                  });
                  setShowCancel(false);
                }}
                disabled={cancelling}
                className="w-full py-3 bg-[#002856] hover:bg-[#001e40] text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Keep Premium
              </button>
              <button
                onClick={handleDisableAutopay}
                disabled={cancelling}
                className="w-full text-center text-rose-600 hover:text-rose-800 font-bold text-xs cursor-pointer py-1.5 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Cancel Premium"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Post-payment celebration — `upgraded` selects the Plus title/refund line. */}
      <PremiumActivatedModal
        open={Boolean(successData)}
        title={successData?.upgraded || boughtPro ? "Career Pro activated!" : "Premium activated!"}
        refundPaise={successData?.refunded_paise}
        mayaValue={mayaFeatureValue(
          user,
          successData?.upgraded || boughtPro
            ? (plusPlan?.mayaMinutesPerDay ?? 30)
            : 10,
        )}
        onClose={() => {
          setSuccessData(null);
          setBoughtPro(false);
          getSubscriptionPlans().then(setPlansInfo).catch(() => {});
        }}
        onGoHome={() => {
          setSuccessData(null);
          navigate("/");
        }}
      />
    </div>
  );
}
