import React, { useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Megaphone, X } from "lucide-react";

// Dismissal is persisted locally per banner version (keyed by updated_at),
// so the banner reappears only after the admin changes/republishes it.
const DISMISS_KEY = "skillcase_announcement_banner";

function readDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistDismissed(updatedAt) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify({ updatedAt }));
  } catch {
    /* storage unavailable — ignore */
  }
}

export default function PromoBanner({ banner }) {
  // NOTE: dismissal must NOT be computed inside a useState initializer — the
  // banner prop arrives asynchronously (null on first render), and initializers
  // only run once, which would lock the banner as hidden forever. Instead we
  // evaluate dismissal on every render (cheap + idempotent) and keep state
  // purely for the close action.
  const [dismissed, setDismissed] = useState(false);

  if (!banner || !banner.is_active || !banner.message) return null;

  const {
    message,
    highlight_text = "",
    background_color = "#002856",
    text_color = "#FFFFFF",
    highlight_bg_color = "#F9C53D",
    highlight_text_color = "#002856",
    is_dismissible = true,
    updated_at,
  } = banner;

  const dismissible = is_dismissible !== false;
  const wasDismissed =
    dismissible && (dismissed || readDismissed()?.updatedAt === updated_at);
  if (wasDismissed) return null;

  const handleClose = () => {
    if (!dismissible) return;
    persistDismissed(updated_at);
    setDismissed(true);
  };

  // Highlight chip: rendered inline when it's part of the message, else appended.
  let before = message;
  let after = "";
  let chip = "";
  if (highlight_text) {
    if (message.includes(highlight_text)) {
      const idx = message.indexOf(highlight_text);
      before = message.slice(0, idx);
      after = message.slice(idx + highlight_text.length);
      chip = highlight_text;
    } else {
      before = message;
      after = "";
      chip = highlight_text;
    }
  }

  const Chip = chip ? (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap ${
        after ? "mx-1" : "ml-1.5"
      }`}
      style={{
        backgroundColor: highlight_bg_color,
        color: highlight_text_color,
      }}
    >
      {chip}
    </span>
  ) : null;

  return (
    <AnimatePresence initial={false}>
      <Motion.div
        key="announcement-banner"
        role="region"
        aria-label="Announcement"
        initial={{ y: -56, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -56, opacity: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 220 }}
        className="relative w-full overflow-hidden select-none"
        style={{ backgroundColor: background_color, color: text_color }}
      >
        <div className="relative flex items-center justify-center flex-wrap gap-x-3 gap-y-1.5 px-6 sm:px-14 py-3 sm:py-3 text-center">
          <p className="text-sm md:text-base text-justify pr-4">
            {before && <span>{before}</span>}
            {Chip}
            {after && <span>{after}</span>}
          </p>
        </div>

        {dismissible && (
          <button
            type="button"
            onClick={handleClose}
            aria-label="Dismiss announcement"
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-white/85 hover:text-white hover:bg-white/15 active:scale-90 transition-all duration-150"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </Motion.div>
    </AnimatePresence>
  );
}
