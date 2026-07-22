import React, { useEffect, useRef } from "react";
import { StickyNote } from "lucide-react";

/**
 * Sticky-note style rejection message shown to a candidate. The seen/unseen
 * state is tracked (via onView) but only surfaced to admins, not candidates.
 */
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
    <div className="w-full p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex flex-col gap-2 text-left">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
          <StickyNote className="w-4 h-4" />
        </div>
        <span className="text-amber-800 text-xs font-bold uppercase tracking-wide">
          Note from reviewer
        </span>
      </div>

      <p className="text-amber-900 text-xs sm:text-sm leading-relaxed">
        {message}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="self-start mt-1 px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[11px] font-bold cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default RejectionNote;
