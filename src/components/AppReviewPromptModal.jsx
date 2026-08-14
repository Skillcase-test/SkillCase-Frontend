import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { AppReview } from "@capawesome/capacitor-app-review";
import { AnimatePresence, motion } from "framer-motion";
import { Star, X } from "lucide-react";
import mayaThumbsup from "../assets/onboarding/mayaThumbsup.webp";
import ModalPortal from "./common/ModalPortal";
import api from "../api/axios";
import { recordEvent } from "../telemetry";

const PLAY_STORE_DEEPLINK = "market://details?id=com.skillcase.app";
const PLAY_STORE_WEB_URL =
  "https://play.google.com/store/apps/details?id=com.skillcase.app";

// Let the streak celebration modal breathe before the review prompt lands on
// top of it — this makes the two modals feel sequenced rather than stacked.
const OPEN_DELAY_MS = 1600;

const REVIEW_EVENT = "skillcase:show-review-prompt";

// Milestone-aware headlines so the ask always feels like a reward.
function getHeadline(streakDays) {
  const days = Number(streakDays) || 0;
  if (days <= 2) return "Two days in a row — awesome!";
  if (days < 7) return `${days} days of consistency — great start!`;
  if (days < 20) return "A full week of daily learning!";
  if (days < 50) return `${days} days of dedication — incredible!`;
  return `What a legend — ${days} days of real dedication!`;
}

export default function AppReviewPromptModal({ blocked = false }) {
  const [pending, setPending] = useState(null); // { milestone, streakDays } queued before open
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pendingRef = useRef(null);
  const openTimerRef = useRef(null);
  const ackedRef = useRef(null); // milestone already acknowledged to server
  // Session-scoped set of milestones already surfaced — a crossed milestone can
  // never re-open later in the same app session, even if the ack POST is slow.
  const surfacedMilestonesRef = useRef(new Set());

  const closeModal = useCallback(() => {
    // AnimatePresence plays the exit animation while `leaving` keeps the
    // portal mounted; the payload clears once it has finished.
    setLeaving(true);
    setVisible(false);
    setTimeout(() => {
      setLeaving(false);
      setPending(null);
      pendingRef.current = null;
      ackedRef.current = null;
    }, 300);
  }, []);

  const openModal = useCallback(
    (payload) => {
      if (!Capacitor.isNativePlatform()) return;
      // Never stack a second prompt on top of an open one, and never surface
      // the same milestone twice within one app session.
      if (visible || leaving || pendingRef.current) return;
      if (surfacedMilestonesRef.current.has(payload.milestone)) return;

      pendingRef.current = payload;
      ackedRef.current = null;
      surfacedMilestonesRef.current.add(payload.milestone);
      setPending(payload);

      const tryOpen = () => {
        // Only open while the app is in the foreground so a backgrounded app
        // does not consume the milestone without the user ever seeing it.
        if (document.visibilityState !== "visible") {
          openTimerRef.current = setTimeout(tryOpen, 500);
          return;
        }
        setVisible(true);
      };
      openTimerRef.current = setTimeout(tryOpen, OPEN_DELAY_MS);
    },
    [leaving, visible],
  );

  // Server-driven trigger: the axios layer dispatches this event whenever a
  // streak response carries a reviewPrompt payload.
  useEffect(() => {
    const listen = (event) => {
      const detail = event?.detail || {};
      const payload = {
        milestone: Number(detail.milestone),
        streakDays: Number(detail.streakDays),
      };
      if (
        !payload.milestone ||
        blocked ||
        document.visibilityState !== "visible"
      ) {
        return;
      }
      openModal(payload);
    };

    window.addEventListener(REVIEW_EVENT, listen);
    return () => {
      window.removeEventListener(REVIEW_EVENT, listen);
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
    };
  }, [blocked, openModal]);

  // Ack the shown milestone once so the server never returns it again. Fire
  // exactly once per open; it is idempotent on the server side.
  useEffect(() => {
    if (!visible || !pending) return;
    if (ackedRef.current === pending.milestone) return;
    ackedRef.current = pending.milestone;

    recordEvent("app_review.prompt_shown", {
      domain: "app_review",
      feature: "play_store_review",
      entity_type: "streak_milestone",
      entity_id: String(pending.milestone),
      lifecycle: "observed",
      attributes: {
        milestone: pending.milestone,
        streak_days: pending.streakDays,
      },
    });

    api
      .post(
        "/streak/review/prompted",
        { milestone: pending.milestone },
        { meta: { skipCacheInvalidation: true } },
      )
      .catch(() => {});
  }, [visible, pending]);

  const handleRateNow = async () => {
    if (!pending || submitting) return;
    setSubmitting(true);

    recordEvent("app_review.rate_clicked", {
      domain: "app_review",
      feature: "play_store_review",
      entity_type: "streak_milestone",
      entity_id: String(pending.milestone),
      lifecycle: "started",
      attributes: {
        milestone: pending.milestone,
        streak_days: pending.streakDays,
      },
    });

    try {
      if (Capacitor.isNativePlatform()) {
        // Google's in-app review (AppReview.requestReview) silently resolves
        // without showing anything once the per-user quota is exhausted, so it
        // can never be relied on here. Always open the Play Store listing — the
        // button promises a store visit and must deliver one every time.
        try {
          await AppReview.openAppStore();
        } catch (openError) {
          console.error("Open app store failed, using deep link:", openError);
          await CapApp.openUrl({ url: PLAY_STORE_DEEPLINK });
        }
      } else {
        window.open(PLAY_STORE_WEB_URL, "_blank", "noopener,noreferrer");
      }

      // Mark reviewed server-side so the prompt never returns.
      api
        .post(
          "/streak/review/completed",
          { milestone: pending.milestone },
          { meta: { skipCacheInvalidation: true } },
        )
        .catch(() => {});
    } catch (error) {
      console.error("Failed to open Play Store:", error);
      try {
        await CapApp.openUrl({ url: PLAY_STORE_DEEPLINK });
      } catch {
        window.open(PLAY_STORE_WEB_URL, "_blank", "noopener,noreferrer");
      }
    } finally {
      setSubmitting(false);
      closeModal();
    }
  };

  const handleMaybeLater = () => {
    if (!pending) return;
    recordEvent("app_review.prompt_dismissed", {
      domain: "app_review",
      feature: "play_store_review",
      entity_type: "streak_milestone",
      entity_id: String(pending.milestone),
      lifecycle: "observed",
      attributes: {
        milestone: pending.milestone,
        streak_days: pending.streakDays,
      },
    });
    closeModal();
  };

  if (!visible && !leaving && !pending) return null;

  const headline = getHeadline(pending?.streakDays);

  return (
    <ModalPortal active={visible || leaving}>
      <AnimatePresence>
        {visible && (
          <div
            className="fixed inset-0 z-9999 flex items-center justify-center p-4 backdrop-blur-xs select-none "
            style={{
              background:
                "radial-gradient(circle, rgba(15, 23, 42, 0.65) 0%, rgba(2, 6, 23, 0.95) 100%)",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-[390px] bg-white rounded-3xl px-6 pt-10 pb-6 relative flex flex-col items-start gap-2.5 max-h-[92dvh] overflow-y-auto"
            >
              <button
                type="button"
                aria-label="Close"
                onClick={handleMaybeLater}
                className="absolute top-2.5 right-2.5 size-7 rounded-full bg-black/25 text-white flex items-center justify-center cursor-pointer hover:bg-black/40 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="self-stretch flex flex-col items-center gap-6">
                <div className="self-stretch flex flex-col items-center gap-3">
                  {/* Maya thumbs-up avatar with floating streak-count badge */}
                  <div className="relative flex items-center justify-center">
                    <div className="size-24 bg-blue-100 rounded-[58.54px] overflow-hidden shrink-0">
                      <img
                        src={mayaThumbsup}
                        alt="Maya giving a thumbs up for your streak"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-2 size-9 bg-[#002856] rounded-full flex items-center justify-center ring-2 ring-white">
                      <span className="text-amber-300 text-sm font-bold">
                        {pending?.streakDays ?? 0}
                      </span>
                    </div>
                  </div>

                  <div className="self-stretch flex flex-col items-center gap-3">
                    <h2 className="self-stretch text-center text-[#002856] text-2xl font-bold leading-8">
                      {headline}
                    </h2>
                    <p className="w-64 text-center text-[#002856] text-xs font-normal leading-5">
                      You're building an amazing habit! A quick rating on the
                      Play Store helps other learners discover Skillcase — it
                      takes just a few seconds.
                    </p>

                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className="size-6 text-amber-400 fill-amber-400"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="self-stretch flex flex-col justify-center items-center gap-2">
                  <motion.button
                    type="button"
                    onClick={handleRateNow}
                    disabled={submitting}
                    whileTap={{ scale: 0.985 }}
                    className="self-stretch px-4 py-3 bg-[#002856] hover:bg-[#001f42] active:bg-[#001f42] rounded-lg shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)] inline-flex justify-center items-center gap-1.5 overflow-hidden text-white text-base font-semibold cursor-pointer transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <Star className="size-5 text-amber-300 fill-amber-300" />
                    <span>
                      {submitting ? "Opening Play Store..." : "Rate us on Play Store"}
                    </span>
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={handleMaybeLater}
                    whileTap={{ scale: 0.985 }}
                    className="self-stretch px-4 py-3 rounded-lg outline outline-offset-[-1px] outline-zinc-400 inline-flex justify-center items-center gap-1.5 text-[#002856] text-base font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Maybe later
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
