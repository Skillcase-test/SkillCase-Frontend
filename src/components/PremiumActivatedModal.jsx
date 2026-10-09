import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import diamond from "../assets/diamond.webp";
import { trackFeatureEvent } from "../telemetry/events";

const PREMIUM_FEATURES = [
  "Streak Challenges",
  "German Lessons",
  "Flashcards",
  "Pronunciation practice",
  "Exam practice",
];

export default function PremiumActivatedModal({
  open,
  onClose,
  onGoHome,
  title = "Premium activated!",
  subtitle = "You have now access to all premium features",
  refundPaise,
  mayaValue,
}) {
  useEffect(() => {
    if (open) {
      trackFeatureEvent("payments", "premium_activated_modal_presented", {
        attributes: { title, refund_paise: refundPaise || 0 },
      });
    }
  }, [open, title, refundPaise]);

  const handleClose = () => {
    trackFeatureEvent("payments", "premium_activated_modal_dismissed", {
      attributes: { title, refund_paise: refundPaise || 0, via: "close_button" },
    });
    onClose?.();
  };

  const handleGoHome = () => {
    trackFeatureEvent("payments", "premium_activated_modal_dismissed", {
      attributes: { title, refund_paise: refundPaise || 0, via: "go_home" },
    });
    onGoHome?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none ">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-[390px] bg-gradient-to-b from-sky-700 to-blue-950 rounded-3xl shadow-2xl px-6 pt-10 pb-6 flex flex-col gap-6 relative overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              aria-label="Close"
              className="absolute top-2.5 right-2.5 size-7 rounded-full bg-white/50 hover:bg-white/70 flex items-center justify-center text-slate-800 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>

            {/* Diamond Hero */}
            <div className="flex flex-col items-center gap-3">
              <div className="size-24 rounded-3xl overflow-hidden">
                <img
                  src={diamond}
                  alt="Premium diamond"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-col items-center gap-3">
                <h3 className="text-center text-white text-2xl font-bold">
                  {title}
                </h3>
                <p className="w-52 text-center text-white text-xs font-normal">
                  {subtitle}
                </p>
                {refundPaise > 0 && (
                  <div className="px-3 py-2 rounded-xl bg-emerald-400/15 border border-emerald-300/30 text-emerald-200 text-xs font-medium text-center leading-relaxed">
                    ₹{Math.round(refundPaise / 100)} refund on its way to your UPI
                  </div>
                )}
              </div>

              {/* What's included */}
              <div className="self-stretch p-4 bg-black/50 rounded-xl flex flex-col gap-4">
                <div className="justify-start text-amber-300 text-base font-normal">
                  What's included
                </div>
                <div className="flex flex-col gap-1">
                  {(mayaValue
                    ? [
                        { label: "Talk to Maya", value: mayaValue },
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
                        <div className="size-2.5 bg-green-600 rounded-full">
                          <Check className="text-white size-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleGoHome}
                className="w-full px-4 py-3 bg-white rounded-lg text-blue-950 text-base font-semibold hover:bg-slate-100 active:scale-[0.99] transition-all cursor-pointer"
              >
                Go to home
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
