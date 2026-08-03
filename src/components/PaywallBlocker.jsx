import { motion } from "framer-motion";
import { Loader2, Phone, Lock, Check } from "lucide-react";
import mayaLooking from "../assets/onboarding/mayaLooking.webp";
import { useAutopayCheckout } from "../hooks/useAutopayCheckout";

export default function PaywallBlocker({ user, dispatch, onSuccess }) {
  const { loading, handlePay } = useAutopayCheckout({ user, dispatch, onSuccess });

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
        whileHover={{
          y: -2,
          boxShadow:
            "0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.08)",
        }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-[390px] bg-white border border-slate-100 rounded-[32px] shadow-2xl py-6 sm:py-8 px-4 sm:px-6 flex flex-col items-center gap-5 sm:gap-6 relative"
      >
        {/* Mascot Image positioned inside the card */}
        <div className="w-20 h-20 rounded-full shadow-sm bg-[#a2c5f2] overflow-hidden flex items-center justify-center shrink-0">
          <img
            src={mayaLooking}
            alt="Maya mascot looking"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Locked Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 bg-slate-100 rounded-full">
          <Lock className="w-3 h-3 text-slate-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Learning plan locked
          </span>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-[26px] font-bold text-[#002856] text-center leading-tight tracking-tight px-1">
          Subscribe for continued access
        </h2>

        {/* Features card inset */}
        <div className="w-full bg-[#f8f9fa] rounded-3xl p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
          <div className="text-center flex items-baseline justify-center gap-1.5">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#002856]">
              ₹99
            </span>
            <span className="text-sm font-bold text-slate-400">/ month</span>
          </div>
          <div className="border-t border-slate-200/60 w-full" />
          <div className="flex flex-col gap-3">
            {[
              "Streak Challenges",
              "German Lessons",
              "Flashcards",
              "Pronunciation practice",
              "Chapter tests",
            ].map((feature, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center text-[11px] sm:text-xs"
              >
                <span className="font-semibold text-slate-600">{feature}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#002856]">Unlimited</span>
                  <div className="w-4 h-4 bg-[#22c55e] rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          <motion.button
            onClick={handlePay}
            disabled={loading}
            whileTap={{ scale: 0.985 }}
            className="w-full h-12 sm:h-13 bg-[#002856] hover:bg-[#001f42] active:bg-[#001f42] text-white rounded-2xl transition-all disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center font-bold text-xs sm:text-sm"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              "Subscribe and pay"
            )}
          </motion.button>
          <motion.a
            href="tel:+919731462667"
            whileTap={{ scale: 0.985 }}
            className="w-full h-12 sm:h-13 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 text-[#002856] cursor-pointer shadow-xs"
          >
            <Phone className="w-4 h-4" />
            <span>Talk to an expert</span>
          </motion.a>
          <p className="text-[10px] text-slate-400 font-semibold text-center mt-1">
            You can cancel it anytime.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
