import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import mayaStanding from "../../assets/onboarding/mayaStanding.webp";
import whiteLogo from "../../assets/onboarding/white_mainlogo.webp";

export default function AppSplashScreen({ message = "Hi, I am Maya.", showTimeoutRetry = false, onRetry }) {
  const [delayedNotice, setDelayedNotice] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDelayedNotice(true);
    }, 4500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35, ease: "easeInOut" } }}
      className="fixed inset-0 z-[99999] bg-gradient-to-b from-[#002856] to-[#1A4B9F] flex flex-col items-center justify-between pt-16 pb-0 overflow-hidden select-none"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 4rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
      }}
    >
      {/* Ambient background glow orbs */}
      <div className="absolute w-[500px] h-[500px] -left-[120px] top-[320px] bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute w-[320px] h-[320px] -right-[60px] top-[420px] bg-white/15 rounded-full blur-2xl pointer-events-none" />

      {/* Top Logo */}
      <div className="relative z-10 flex flex-col items-center">
        <img
          src={whiteLogo}
          alt="Skillcase"
          className="h-32 sm:h-40 md:h-44 object-contain drop-shadow-md"
        />
      </div>

      {/* Center/Bottom Mascot & Speech bubble */}
      <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-end">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          className="mb-3 relative bg-white px-6 py-3 rounded-2xl shadow-xl flex items-center justify-center max-w-[85%]"
        >
          <span className="text-black text-[15px] font-semibold text-center leading-tight">
            {message}
          </span>
          <div className="absolute -bottom-[8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-white" />
        </motion.div>

        {/* Mascot Image */}
        <motion.img
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          src={mayaStanding}
          alt="Maya"
          className="w-[75%] max-w-[260px] sm:max-w-[280px] md:max-w-[300px] object-contain object-bottom"
        />
      </div>

      {/* Optional graceful fallback if network is very slow */}
      {delayedNotice && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
        >
          <span className="text-white/80 text-xs font-medium">
            Connecting to Skillcase...
          </span>
          {showTimeoutRetry && onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-sm transition-all"
            >
              Retry
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
