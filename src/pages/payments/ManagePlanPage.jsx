import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { ArrowLeft, Gem, Headset, X, Loader2, Check } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { setUser } from "../../redux/auth/authSlice";
import diamond from "../../assets/diamond.webp";
import mayaSad from "../../assets/onboarding/mayaSad.webp";

const PREMIUM_FEATURES = [
  "Streak Challenges",
  "German Lessons",
  "Flashcards",
  "Pronunciation practice",
  "Exam practice",
];

const SUPPORT_PHONE = "+919731462667";

export default function ManagePlanPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Not premium with recurring autopay → redirect
  if (user?.autopay_enabled !== true) {
    return <Navigate to={user?.is_paid ? "/profile" : "/profile/upgrade"} replace />;
  }

  const handleDisableAutopay = async () => {
    setCancelling(true);
    try {
      const res = await api.post("/user/disable-autopay");
      dispatch(setUser(res.data.user));
      toast.success("Subscription cancelled successfully");
      setShowCancel(false);
      navigate("/profile");
    } catch (err) {
      console.error("Cancel subscription error:", err);
      toast.error(err.response?.data?.msg || "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

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
        <h1 className="text-white text-base font-semibold">Manage Plan</h1>
      </div>

      <div className="px-4 pt-4 pb-10 flex flex-col gap-9">
        <div className="flex flex-col items-center gap-3">
          {/* Diamond Hero */}
          <div className="size-24 rounded-3xl overflow-hidden">
            <img
              src={diamond}
              alt="Premium"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col items-center gap-7 w-full">
            <div className="flex flex-col items-center gap-3">
              <h2 className="text-center text-white text-2xl font-bold">
                Premium Active
              </h2>
              <p className="w-80 text-center text-white text-xs font-normal">
                You have now access to all premium features
              </p>
            </div>

            {/* What's included */}
            <div className="self-stretch p-4 bg-black/50 rounded-xl flex flex-col gap-4">
              <div className="text-amber-300 text-base font-normal">
                What's included
              </div>
              <div className="flex flex-col gap-1">
                {PREMIUM_FEATURES.map((feature) => (
                  <div
                    key={feature}
                    className="flex justify-between items-center"
                  >
                    <span className="text-white text-xs font-normal">
                      {feature}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-xs font-medium">
                        Unlimited
                      </span>
                      <div className="size-2.5 bg-green-600 rounded-full">
                        <Check className="text-white size-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Plan details */}
            <div className="self-stretch p-4 bg-black/50 rounded-xl flex flex-col gap-4">
              <div className="text-amber-300 text-base font-normal">
                Monthly Plan details
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-white text-xs font-normal">
                    Premium membership fee
                  </span>
                  <span className="text-white text-xs font-normal">₹99</span>
                </div>
                <div className="w-full h-0 border-t border-white/40" />
                <div className="flex justify-between items-center">
                  <span className="text-white text-xs font-semibold">
                    Total monthly amount
                  </span>
                  <span className="text-white text-xs font-semibold">₹99</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3">
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="w-full px-4 py-3 bg-linear-to-r from-amber-300 to-amber-400 rounded-lg text-blue-950 text-base font-semibold hover:bg-amber-400 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-amber-400/80"
          >
            <Headset className="size-5 text-blue-950" />
            <span>Get priority support</span>
          </a>
          <button
            onClick={() => setShowCancel(true)}
            className="w-full px-4 py-3 bg-transparent rounded-lg outline-1 outline-zinc-400 text-white text-base font-semibold hover:bg-white/5 active:scale-[0.99] transition-all cursor-pointer"
          >
            Cancel Premium
          </button>
        </div>
      </div>

      {/* Cancel Premium Confirmation Modal */}
      {showCancel && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none ">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-5 relative"
          >
            <button
              onClick={() => setShowCancel(false)}
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
              You have covered a long way in your German journey. Once
              cancelled, your monthly plan will not renew.
            </p>

            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={() => setShowCancel(false)}
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
    </div>
  );
}
