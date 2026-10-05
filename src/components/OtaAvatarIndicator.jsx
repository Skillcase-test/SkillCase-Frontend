import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

const RING_PAD = 5;
const CARD_W = 230;
const CARD_H = 46;
const CARD_DWELL_MS = 1600;
const MEASURE_MS = 400;
const CIRC = 2 * Math.PI * 16;

// Overlays a circular download ring on the navbar avatar (#profile-nav-link).
// The update card announces first, then morphs into the avatar. Only renders
// on screens that actually show the avatar — inside lessons/flows it waits
// hidden rather than floating over content.
export default function OtaAvatarIndicator({
  otaState,
  otaProgress = 0,
  onUpdateNow,
  onUpdateLater,
}) {
  const active = otaState === "ota_downloading" || otaState === "ota_ready";
  const ready = otaState === "ota_ready";
  const [avatarRect, setAvatarRect] = useState(null);
  const [phase, setPhase] = useState("card"); // 'card' -> 'docked'
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!active) return undefined;
    const measure = () => {
      const el = document.getElementById("profile-nav-link");
      if (!el) {
        setAvatarRect((prev) => (prev === null ? prev : null));
        return;
      }
      const r = el.getBoundingClientRect();
      setAvatarRect((prev) =>
        prev &&
        Math.abs(prev.x - r.x) < 1 &&
        Math.abs(prev.y - r.y) < 1 &&
        Math.abs(prev.width - r.width) < 1 &&
        Math.abs(prev.height - r.height) < 1
          ? prev
          : { x: r.x, y: r.y, width: r.width, height: r.height },
      );
    };
    measure();
    const id = setInterval(measure, MEASURE_MS);
    window.addEventListener("resize", measure);
    return () => {
      clearInterval(id);
      window.removeEventListener("resize", measure);
    };
  }, [active]);

  useEffect(() => {
    if (otaState === "ota_downloading") {
      setPhase("card");
      setDialogOpen(false);
      const t = setTimeout(() => setPhase("docked"), CARD_DWELL_MS);
      return () => clearTimeout(t);
    }
    if (otaState === "ota_ready") {
      setPhase("docked");
      setDialogOpen(false);
    }
    return undefined;
  }, [otaState]);

  // Dismiss an open popover when the avatar (and thus the indicator) leaves
  useEffect(() => {
    if (!avatarRect) setDialogOpen(false);
  }, [avatarRect]);

  const show = active && avatarRect !== null;
  const vw = window.innerWidth;
  // Padded avatar rect the ring docks onto — placeholder only while hidden
  const dockedRect = avatarRect
    ? {
        x: avatarRect.x - RING_PAD,
        y: avatarRect.y - RING_PAD,
        w: avatarRect.width + RING_PAD * 2,
        h: avatarRect.height + RING_PAD * 2,
      }
    : { x: vw - 46, y: 72, w: 32, h: 32 };

  const cardRect = {
    x: vw / 2 - CARD_W / 2,
    y: (avatarRect?.y ?? 56) + (avatarRect?.height ?? 32) + 16,
    w: CARD_W,
    h: CARD_H,
  };

  const target = phase === "card" ? cardRect : dockedRect;
  const progress = Math.max(0, Math.min(100, otaProgress));
  const popoverLeft = Math.min(
    Math.max(8, dockedRect.x + dockedRect.w - 232),
    vw - 240,
  );
  const popoverTop = dockedRect.y + dockedRect.h + 10;

  return createPortal(
    <AnimatePresence>
      {show && (
      <motion.div
        key="ota-avatar"
        className="fixed left-0 top-0 z-[999]"
        style={{
          pointerEvents: ready ? "auto" : "none",
          cursor: ready ? "pointer" : "default",
        }}
        initial={{
          x: cardRect.x,
          y: cardRect.y,
          width: cardRect.w,
          height: cardRect.h,
          opacity: 0,
        }}
        animate={{
          x: target.x,
          y: target.y,
          width: target.w,
          height: target.h,
          opacity: 1,
        }}
        exit={{ opacity: 0, scale: 0.6 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        onClick={ready ? () => setDialogOpen(true) : undefined}
        role={ready ? "button" : undefined}
        aria-label={ready ? "Update ready — tap to apply" : undefined}
      >
        {/* Announcement card (crossfades out while docking) */}
        <AnimatePresence>
          {phase === "card" && (
            <motion.div
              key="card"
              className="absolute inset-0 flex items-center gap-2.5 rounded-2xl bg-white px-3.5 shadow-xl border border-slate-200/70"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#002856]">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-bold leading-4 text-slate-800">
                  Downloading update…
                </p>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#002856] transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-bold tabular-nums text-slate-500">
                {Math.round(progress)}%
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Docked ring (fades in while morphing onto the avatar) */}
        <AnimatePresence>
          {phase === "docked" && (
            <motion.div
              key="ring"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, delay: 0.15 }}
            >
              <svg
                viewBox="0 0 36 36"
                className="absolute inset-0 h-full w-full -rotate-90"
              >
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="rgba(148,163,184,0.55)"
                  strokeWidth="2.4"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke={ready ? "#22c55e" : "#002856"}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - progress / 100)}
                  style={{ transition: "stroke-dashoffset 0.2s linear" }}
                />
              </svg>

              {ready && (
                <motion.span
                  className="absolute -bottom-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#22c55e] shadow ring-2 ring-white"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                >
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="2 6.5 4.8 9.2 10 3" />
                  </svg>
                </motion.span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      )}

      {/* Update-now/later popover anchored under the avatar */}
      {show && dialogOpen && ready && (
        <>
          <div
            key="ota-popover-backdrop"
            className="fixed inset-0 z-[998]"
            onClick={() => setDialogOpen(false)}
          />
          <motion.div
            key="ota-popover"
            className="fixed z-[1000] w-56 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xl"
            style={{ top: popoverTop, left: popoverLeft }}
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
          >
            <p className="text-sm font-bold text-slate-800">Update ready</p>
            <p className="mb-3 mt-1 text-xs leading-4 text-slate-500">
              Restart now to apply it, or it will apply on the next launch.
            </p>
            <button
              onClick={onUpdateNow}
              className="mb-2 w-full rounded-full bg-[#002856] py-2.5 text-sm font-bold text-white transition-all duration-200 active:scale-95"
            >
              Update Now
            </button>
            <button
              onClick={() => {
                setDialogOpen(false);
                onUpdateLater?.();
              }}
              className="w-full rounded-full border border-slate-200 py-2 text-sm font-medium text-slate-500 transition-all duration-200 active:scale-95"
            >
              Later
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
