import React, { useEffect, useRef } from "react";
import { StickyNote } from "lucide-react";
import { motion } from "framer-motion";

// Tactile Sticky Post-It Note style rejection message shown to a candidate.
const RejectionNote = ({
  message,
  viewedAt,
  onView,
  actionLabel,
  onAction,
}) => {
  const hasFiredView = useRef(false);

  useEffect(() => {
    if (!message) return;
    if (viewedAt || hasFiredView.current) return;
    hasFiredView.current = true;
    onView?.();
  }, [message, viewedAt, onView]);

  if (!message) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="relative w-full p-4 bg-gradient-to-b from-amber-50 via-amber-50/90 to-amber-100/50 rounded-2xl border border-amber-200/80 shadow-[0_4px_16px_rgba(217,119,6,0.08)] flex flex-col gap-3 text-left overflow-hidden font-sans"
    >
      {/* Subtle paper tape accent at the top center */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-2 bg-amber-200/40 rounded-b-sm pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-xl bg-amber-100/90 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
          <StickyNote className="w-3.5 h-3.5" />
        </div>
        <span className="text-amber-800/90 text-[10px] font-extrabold uppercase tracking-wider">
          Note from Reviewer
        </span>
      </div>

      {/* Quote Message */}
      <div className="border-l-2 border-amber-400/80 pl-3 py-0.5">
        <p className="text-amber-950 text-xs sm:text-sm font-medium leading-relaxed">
          {message}
        </p>
      </div>

      {/* Action Button */}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="self-start mt-1 px-3.5 py-1.5 bg-white hover:bg-amber-100/80 text-amber-900 border border-amber-300/80 rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-sm active:scale-[0.98] cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
};

export default RejectionNote;
