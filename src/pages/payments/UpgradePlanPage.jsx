import { useEffect, useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, Gem, Check } from "lucide-react";
import { useAutopayCheckout } from "../../hooks/useAutopayCheckout";
import { getSubscriptionPlans } from "../../api/subscriptionApi";
import { isB2PracticeLevel } from "../../utils/b1Progress";
import { mayaFeatureValue } from "../../utils/premium";
import PremiumActivatedModal from "../../components/PremiumActivatedModal";
import diamond from "../../assets/diamond.webp";

const PLAN_FEATURES = [
  "Unlimited AI conversations",
  "Unlimited German lessons",
  "Unlimited Flashcards",
  "Unlimited learning & many more",
];

const rupees = (paise) => Math.round((paise || 0) / 100);

export default function UpgradePlanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [showSuccess, setShowSuccess] = useState(false);
  // The plans this learner may buy, from the server (Plus is B2-only). null =
  // still loading — the standard ₹99 card renders in the meantime.
  const [plans, setPlans] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("standard");

  useEffect(() => {
    getSubscriptionPlans()
      .then((d) => setPlans(d?.plans || []))
      .catch(() => setPlans([]));
  }, []);

  const { loading, handlePay } = useAutopayCheckout({
    user,
    dispatch,
    onSuccess: () => setShowSuccess(true),
  });

  const selected = plans?.find((p) => p.key === selectedPlan) || null;
  const priceLabel = `₹${rupees(selected?.amountPaise ?? 9900)}`;
  const hasChoice = (plans?.length || 0) > 1;
  // Talk to Maya is minute-metered only at B2 — for B1 it's unmetered once
  // paid ("Unlimited AI conversations" already covers it) and lower levels
  // don't have the feature.
  const b2MayaLabel = isB2PracticeLevel(user?.user_prof_level)
    ? `Talk to Maya · ${selected?.mayaMinutesPerDay ?? 10} min/day`
    : null;

  // Already premium → manage plan instead of a second upgrade. (Keep the
  // success modal visible right after checkout completes, then let Go/close
  // navigate away.)
  if (user?.autopay_enabled === true && !showSuccess) {
    return <Navigate to="/profile/manage-plan" replace />;
  }

  if (user?.is_paid === true && !showSuccess) {
    return <Navigate to="/profile" replace />;
  }

  // Never took the free trial yet → the trial offer comes first; the user
  // only lands on payment after the trial is claimed (or they skip it).
  // skipTrialOffer is set by the offer screen's "May be later", so choosing to
  // skip lands here for real instead of ping-ponging back to the offer.
  if (
    user &&
    !user.trial_taken &&
    !showSuccess &&
    !location.state?.skipTrialOffer
  ) {
    return (
      <Navigate
        to="/trial-offer"
        state={{ from: "/profile/upgrade" }}
        replace
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#002856] flex flex-col ">
      {/* Header */}
      <div
        className="px-4 pb-2.5 flex items-center gap-3"
        style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top, 0px))" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="size-7 flex items-center justify-center rounded-md border-2 border-white/40 text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-white text-base font-semibold">
          Payment
        </h1>
      </div>

      <div className="px-4 pt-4 pb-10 flex flex-col gap-9">
        {/* Plan picker — only when the learner has a real choice (B2 → Plus exists) */}
        {hasChoice && (
          <div className="flex gap-1 rounded-full bg-white/10 p-1" role="radiogroup" aria-label="Choose a plan">
            {plans.map((p) => {
              const active = selectedPlan === p.key;
              const plus = p.key === "b2_plus";
              return (
                <motion.button
                  key={p.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelectedPlan(p.key)}
                  variants={{ off: { scale: 1 }, on: { scale: [1, 1.06, 1] } }}
                  animate={active ? "on" : "off"}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  whileTap={{ scale: 0.96 }}
                  className={`flex-1 rounded-full px-3 py-1.5 text-center cursor-pointer transition-colors ${
                    active ? "bg-amber-300 shadow-[0_2px_12px_rgba(237,184,67,0.5)]" : "bg-transparent"
                  }`}
                >
                  <span className={`flex items-center justify-center gap-1 text-[13px] font-semibold leading-5 ${active ? "text-[#002856]" : "text-white/50"}`}>
                    {plus && <Gem className={`size-3 ${active ? "text-[#002856]" : "text-white/35"}`} />}
                    {p.label} ₹{rupees(p.amountPaise)}
                  </span>
                  <span className={`block text-[10px] leading-4 ${active ? "text-[#002856]/70" : "text-white/35"}`}>
                    {p.mayaMinutesPerDay ? `Maya ${p.mayaMinutesPerDay} min/day` : "All premium features"}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Premium Plan Card */}
        <div className="p-4 bg-black/50 rounded-xl flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-amber-300 rounded-3xl flex items-center justify-center">
                <Gem className="size-4 text-[#002856]" />
              </div>
              <span className="text-white text-base font-semibold">
                {selected ? `${selected.label} Plan` : "Premium Plan"}
              </span>
            </div>
            <span className="text-white/60 text-xs font-normal">
              Monthly Plan
            </span>
          </div>

          <div className="flex justify-start items-start gap-4">
            <div className="flex-1 flex flex-col gap-1">
              {(b2MayaLabel
                ? [b2MayaLabel, ...PLAN_FEATURES.slice(1)]
                : PLAN_FEATURES
              ).map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <div className="size-2.5 bg-green-600 rounded-full shrink-0">
                    <Check className="text-white size-full" />
                  </div>
                  <span className="text-white/80 text-xs font-normal">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
            <div className="size-24 rounded-3xl overflow-hidden shrink-0">
              <img
                src={diamond}
                alt="Premium"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="h-0 border-t border-white/40" />

          <span className="text-white text-base font-medium">
            Price Details
          </span>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-white text-xs font-normal">
                {selected ? `${selected.label} Plan fee` : "Premium Plan fee"}
              </span>
              <span className="text-white text-xs font-normal">{priceLabel}</span>
            </div>
            <div className="w-full h-0 border-t border-white/40" />
            <div className="flex justify-between items-center">
              <span className="text-white text-xs font-semibold">
                Total Amount
              </span>
              <span className="text-white text-xs font-semibold">{priceLabel}</span>
            </div>
          </div>
        </div>

        {/* UPI only — Razorpay opens on the UPI pane, nothing to pick here. */}
        <div className="p-2.5 rounded-xl outline-offset-[-1px] outline outline-amber-300 bg-white/10 flex items-center gap-3">
          <div className="size-8 bg-white rounded-sm flex items-center justify-center shrink-0">
            <span className="text-[#002856] text-[8px] font-bold">UPI</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-white text-xs font-bold">UPI</span>
            <span className="text-white text-xs font-normal">
              Google Pay, PhonePe, Paytm, BHIM & more
            </span>
          </div>
        </div>

        {/* Pay */}
        <div className="flex flex-col items-center gap-2">
          <motion.button
            onClick={() => handlePay(selectedPlan)}
            disabled={loading}
            whileTap={{ scale: 0.98 }}
            className="w-full px-4 py-3 bg-linear-to-r from-amber-300 to-amber-400 rounded-lg text-[#002856] text-base font-semibold hover:bg-amber-400 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border border-amber-400/80"
          >
            {loading ? "Processing..." : `Pay ${priceLabel} via UPI`}
          </motion.button>
          <p className="flex items-center gap-1 text-white/60 text-xs font-medium">
            You can cancel it anytime
            <ChevronRight className="size-3" />
          </p>
        </div>
      </div>

      <PremiumActivatedModal
        open={showSuccess}
        mayaValue={mayaFeatureValue(user, selected?.mayaMinutesPerDay)}
        onClose={() => {
          setShowSuccess(false);
          navigate("/profile");
        }}
        onGoHome={() => {
          setShowSuccess(false);
          navigate("/");
        }}
      />
    </div>
  );
}
