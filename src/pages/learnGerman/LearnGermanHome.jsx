import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Check, Lock, X } from "lucide-react";
import germanFlag from "../../assets/onboarding/germanFlag.webp";
import mayaThumbsup from "../../assets/onboarding/mayaThumbsup.webp";
import {
  getLGMode,
  getLessonsList,
  getVocabProgress,
} from "../../api/learnGermanApi";
import DailyGoalModal, {
  shouldShowDailyGoal,
  markDailyGoalShown,
  shouldShowDailyGoalCompleted,
  markDailyGoalCompletedShown,
} from "./DailyGoalModal";
import DailyGoalCompletedModal from "./DailyGoalCompletedModal";
import TypewriterText from "./lesson/screens/shared/TypewriterText";

import bg1 from "../../assets/2.webp";
import bg2 from "../../assets/1.webp";
import bg3 from "../../assets/3.webp";

import api from "../../api/axios";
import { setClarityTag, trackClarityEvent } from "../../observability/clarity";
import {
  getLgGuideStage,
  LG_GUIDE_STAGES,
  setLgGuideStage,
  getLgFirstLandingMarker,
  clearLgFirstLandingMarker,
} from "./lgFirstTimeGuide";

const LEARN_GERMAN_FALLBACK_IMAGE =
  "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778253329/99ee50b94881e4e072cc6de5dde475531353120d_f100ew.webp";

// Static City Background using the provided 3 PNGs
const CityBackground = ({ fromSwitcher }) => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    <motion.img
      src={bg1}
      alt="Background Top Right"
      initial={fromSwitcher ? { opacity: 0, y: -200 } : false}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.1 }}
      className="absolute top-[15%] right-[0%] w-[35%] max-w-[250px] object-contain"
    />
    <motion.img
      src={bg2}
      alt="Background Middle Left"
      initial={fromSwitcher ? { opacity: 0, x: -250 } : false}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.2 }}
      className="absolute top-[50%] left-[-6%] w-[55%] max-w-[300px] object-contain"
    />
    <motion.img
      src={bg3}
      alt="Background Bottom Right"
      initial={fromSwitcher ? { opacity: 0, y: 250 } : false}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.3 }}
      className="absolute bottom-[2%] right-[-8%] w-[55%] max-w-[350px] object-contain"
    />
  </div>
);

// Road SVG that curves like a thick translucent ribbon
const RoadSegment = ({ direction }) => {
  const isLeftToRight = direction === "left-to-right";

  const pathD = isLeftToRight
    ? "M 160,80 C 330,20 280,200 260,280 L 260,400"
    : "M 190,80 C 20,20 70,200 90,280 L 90,400";

  return (
    <div className="absolute top-[30px] left-0 w-full h-[400px] pointer-events-none -z-10">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 352 400"
        fill="none"
        className="overflow-visible"
      >
        {/* Outer Shadow */}
        <path
          d={pathD}
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="44"
          strokeLinecap="round"
        />
        {/* Border / Edge */}
        <path
          d={pathD}
          stroke="#e2e8f0"
          strokeWidth="42"
          strokeLinecap="round"
        />
        {/* Main Ribbon Body */}
        <path
          d={pathD}
          stroke="#ffffff"
          strokeWidth="38"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

const GuideSpotlight = ({ rect, radius = 22, onClick, children }) => {
  const padding = 12;
  const top = Math.max(0, rect.top - padding);
  const left = Math.max(0, rect.left - padding);
  const width = rect.width + padding * 2;
  const height = rect.height + padding * 2;
  const calloutTop = top > 118 ? top - 110 : top + height + 16;
  const calloutLeft = Math.min(
    Math.max(16, left + width / 2 - 150),
    Math.max(16, window.innerWidth - 316),
  );

  const blurPanelClass = "absolute bg-slate-950/50 backdrop-blur-[5px]";

  return (
    <div className="fixed inset-0 z-[260]">
      <div
        className={blurPanelClass}
        style={{ left: 0, top: 0, right: 0, height: top }}
      />
      <div
        className={blurPanelClass}
        style={{ left: 0, top, width: left, height }}
      />
      <div
        className={blurPanelClass}
        style={{ left: left + width, top, right: 0, height }}
      />
      <div
        className={blurPanelClass}
        style={{ left: 0, top: top + height, right: 0, bottom: 0 }}
      />

      <motion.button
        type="button"
        onClick={onClick}
        className="absolute bg-transparent"
        style={{ top, left, width, height, borderRadius: radius }}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <motion.span
          className="absolute inset-0 border-[3px] border-white rounded-[inherit] shadow-[0_0_0_1px_rgba(255,255,255,0.75),0_18px_45px_rgba(0,0,0,0.3)]"
          animate={{
            boxShadow: [
              "0 0 0 1px rgba(255,255,255,0.75), 0 0 0 0 rgba(255,255,255,0.8), 0 18px 45px rgba(0,0,0,0.3)",
              "0 0 0 1px rgba(255,255,255,0.75), 0 0 0 12px rgba(255,255,255,0), 0 18px 45px rgba(0,0,0,0.3)",
            ],
          }}
          transition={{ duration: 1.35, repeat: Infinity, ease: "easeOut" }}
        />
        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-blue-950 shadow-lg">
          Tap to start
        </span>
      </motion.button>

      <motion.div
        className="absolute w-[300px] max-w-[calc(100vw-32px)] rounded-[22px] bg-white px-4 py-3 shadow-[0_20px_45px_rgba(15,23,42,0.28)] border border-white/80"
        style={{ top: calloutTop, left: calloutLeft }}
        initial={{ y: 10, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 24,
          delay: 0.08,
        }}
      >
        <div
          className={`absolute left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white ${
            top > 118 ? "-bottom-2" : "-top-2"
          }`}
        />
        {children}
      </motion.div>
    </div>
  );
};

function RestartLessonModal({ isOpen, chapterTitle, onRestart, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-[400px] relative bg-gradient-to-b from-blue-100 to-sky-100 rounded-[24px] overflow-hidden shadow-2xl flex flex-col items-center pt-10 pb-6 px-4 gap-5">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 w-6 h-6 bg-black/25 rounded-full flex items-center justify-center hover:bg-black/40 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-white" />
        </button>

        <h2 className="text-blue-950 font-bold text-2xl text-center leading-tight z-20">
          Restart Lesson
        </h2>

        <div className="w-full flex flex-col items-center gap-0">
          {!!chapterTitle && (
            <p className="text-blue-950/80 text-md text-center mb-4 z-30 font-bold">
              {chapterTitle}
            </p>
          )}
          <div className="relative z-30 w-full flex justify-center">
            <div className="relative bg-white rounded-2xl shadow-sm px-5 py-3 max-w-[280px] text-center">
              <p className="text-black text-[15px] font-medium leading-snug">
                <TypewriterText text="Ready to try again? Let’s go!" />
              </p>
              <div className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rotate-45 shadow-sm -z-10" />
            </div>
          </div>
          <div
            className="relative w-full flex justify-center"
            style={{ height: 150 }}
          >
            <div className="absolute w-[240px] h-[240px] bg-white/40 rounded-full top-[-60px] z-0" />
            <div className="absolute w-[160px] h-[160px] bg-white rounded-full top-[-20px] z-10" />
            <motion.img
              src={mayaThumbsup}
              alt="Maya"
              className="relative z-20 h-36 object-contain drop-shadow-md self-end"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.4, delay: 0.15 }}
            />
          </div>
        </div>

        <div className="w-full flex gap-2 z-30">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-full bg-white text-blue-900 font-semibold shadow-[0_3px_8px_rgba(0,0,0,0.18)] active:scale-[0.98] transition-all"
          >
            No
          </button>
          <button
            onClick={onRestart}
            className="flex-1 py-3 rounded-full bg-gradient-to-r from-blue-900 to-blue-950 text-white font-semibold shadow-[0_3px_8px_rgba(0,0,0,0.25)] active:scale-[0.98] transition-all"
          >
            Restart
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Card Content Sub-Components ---
function CompletedCardContent({
  mod,
  displayId,
  isBeingMarkedComplete,
  onRestart,
  onRecap,
}) {
  return (
    <div className="w-[200px] h-full px-2.5 pt-2.5 pb-3 bg-gradient-to-br from-blue-50 to-blue-200 rounded-[20px] shadow-[2px_2px_4px_0px_rgba(0,0,0,0.25)] outline-[5px] outline-offset-[-5px] outline-white flex flex-col items-center gap-2.5 relative overflow-visible">
      {/* Energy double ripple on just-completed card */}
      <AnimatePresence>
        {isBeingMarkedComplete && (
          <>
            <motion.span
              key="ripple-1"
              className="absolute inset-0 rounded-[20px] border-4 border-[#00c853] pointer-events-none z-30"
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 0, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 1.0 }}
            />
            <motion.span
              key="ripple-2"
              className="absolute inset-0 rounded-[20px] border-2 border-[#00c853] pointer-events-none z-30"
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 0, scale: 1.35 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, delay: 1.1, ease: "easeOut" }}
            />
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isBeingMarkedComplete ? (
          <motion.div
            key="check-anim"
            className="absolute -right-2 -top-2 size-8 rounded-full border-2 flex items-center justify-center shadow-md z-20 overflow-hidden"
            initial={{
              scale: 0,
              backgroundColor: "#ffffff",
              borderColor: "#00c853",
            }}
            animate={{
              scale: 1,
              backgroundColor: ["#ffffff", "#ffffff", "#00c853"],
              borderColor: ["#00c853", "#00c853", "#ffffff"],
            }}
            transition={{
              scale: { duration: 0.5, type: "spring", bounce: 0.5, delay: 1.0 },
              backgroundColor: {
                duration: 0.8,
                times: [0, 0.75, 1],
                ease: "easeOut",
                delay: 1.0,
              },
              borderColor: {
                duration: 0.8,
                times: [0, 0.75, 1],
                ease: "easeOut",
                delay: 1.0,
              },
            }}
          >
            <motion.svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-5 h-5"
              initial={{ color: "#00c853" }}
              animate={{ color: ["#00c853", "#00c853", "#ffffff"] }}
              transition={{
                duration: 0.8,
                times: [0, 0.75, 1],
                ease: "easeOut",
                delay: 1.0,
              }}
            >
              <motion.path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 1.15 }}
              />
            </motion.svg>
          </motion.div>
        ) : (
          <div className="absolute -right-2 -top-2 size-8 bg-[#00c853] rounded-full border-2 border-white flex items-center justify-center shadow-md z-20">
            <Check className="w-5 h-5 text-white" strokeWidth={3} />
          </div>
        )}
      </AnimatePresence>
      <div className="w-full h-28 overflow-hidden rounded-[10px]">
        <img
          className="w-full h-full object-cover"
          src={mod.chapter_image || LEARN_GERMAN_FALLBACK_IMAGE}
          alt={mod.title}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="flex flex-col items-center gap-1.5 w-full">
        <div className="px-2 py-0.5 bg-black/10 rounded-[10px]">
          <span className="text-black/40 text-[10px] font-medium">
            Level {displayId} completed
          </span>
        </div>
        <div className="text-center text-black text-sm font-semibold opacity-50 px-2 leading-tight">
          {mod.title}
        </div>
      </div>

      {/* Buttons: Restart (left) and Recap (right) */}
      <div className="w-full flex gap-1 mt-auto z-20 h-9 relative items-center">
        {isBeingMarkedComplete ? (
          <>
            {/* Morphing Restart Button (Droplet budding out of left edge) */}
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onRestart?.();
              }}
              initial={{ width: 0, scale: 0.3, opacity: 0, marginRight: 0 }}
              animate={{ width: 44, scale: 1, opacity: 1, marginRight: 4 }}
              transition={{
                type: "spring",
                stiffness: 150,
                damping: 10,
                delay: 1.0,
              }}
              className="h-9 bg-white rounded-[10px] shadow-md/30 flex items-center justify-center text-[#414651] hover:bg-gray-50 active:scale-95 transition-all cursor-pointer border border-[#e5e7eb]/40 shrink-0 overflow-hidden"
              title="Restart Lesson"
            >
              <motion.svg
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 1.4 }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-[#414651]"
              >
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <polygon
                  points="10.5 9.5 15.5 12 10.5 14.5"
                  fill="currentColor"
                />
              </motion.svg>
            </motion.button>

            {/* Morphing Recap Button */}
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onRecap?.();
              }}
              initial={{ width: "100%" }}
              animate={{ width: "auto" }}
              transition={{
                type: "spring",
                stiffness: 150,
                damping: 10,
                delay: 1.0,
              }}
              className="flex-1 h-9 bg-white rounded-[10px] shadow-md/30 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all cursor-pointer border border-[#e5e7eb]/40 overflow-hidden relative"
            >
              {/* Fade out: Continue challenge text */}
              <motion.span
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.7 }}
                className="absolute text-black text-sm font-semibold whitespace-nowrap"
              >
                {mod.user_status === "in_progress"
                  ? "Continue challenge"
                  : "Start challenge"}
              </motion.span>

              {/* Fade in: Recap text */}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 1.4 }}
                className="absolute text-[#09090b] text-sm font-semibold"
              >
                Recap
              </motion.span>
            </motion.button>
          </>
        ) : (
          <>
            {/* Restart Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRestart?.();
              }}
              className="w-11 h-9 bg-white rounded-[10px] shadow-md/30 flex items-center justify-center text-[#414651] hover:bg-gray-50 active:scale-95 transition-all cursor-pointer border border-[#e5e7eb]/40 shrink-0"
              title="Restart Lesson"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-[#414651]"
              >
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <polygon
                  points="10.5 9.5 15.5 12 10.5 14.5"
                  fill="currentColor"
                />
              </svg>
            </button>

            {/* Recap Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRecap?.();
              }}
              className="flex-1 h-9 bg-white rounded-[10px] shadow-md/30 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all cursor-pointer border border-[#e5e7eb]/40"
            >
              <span className="text-[#09090b] text-sm font-semibold">
                Recap
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ActiveCardContent({
  mod,
  displayId,
  btnText,
  isBeingUnlocked,
  isFadingOut,
}) {
  return (
    <div className="w-[200px] h-full px-2.5 pt-2.5 pb-3 bg-gradient-to-br from-yellow-100 to-orange-300 rounded-[20px] shadow-[2px_2px_4px_0px_rgba(0,0,0,0.25)] outline-[5px] outline-offset-[-5px] outline-white flex flex-col items-center gap-2.5 relative overflow-visible">
      {/* Orange pulse ring on just-unlocked card */}
      <AnimatePresence>
        {isBeingUnlocked && (
          <motion.span
            key="unlock-ring"
            className="absolute inset-0 rounded-[20px] border-4 border-orange-400 pointer-events-none z-30"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: [0, 1, 0.8, 1],
              scale: [0.95, 1.05, 1.03, 1.05],
              boxShadow: [
                "0 0 0px rgba(251,146,60,0)",
                "0 0 35px rgba(251,146,60,0.7)",
                "0 0 20px rgba(251,146,60,0.4)",
                "0 0 35px rgba(251,146,60,0.7)",
              ],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut", delay: 0.6 }}
          />
        )}
      </AnimatePresence>
      {/* Shimmer sweeping effect on just-unlocked card */}
      <AnimatePresence>
        {isBeingUnlocked && (
          <motion.div
            key="shimmer"
            className="absolute inset-0 z-40 pointer-events-none rounded-[20px]"
            style={{
              background:
                "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.7) 50%, transparent 80%)",
              backgroundSize: "200% 100%",
            }}
            initial={{ backgroundPosition: "200% 0" }}
            animate={{ backgroundPosition: "-100% 0" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut", delay: 0.6 }}
          />
        )}
      </AnimatePresence>
      <div className="w-full h-28 overflow-hidden rounded-[10px]">
        <img
          className="w-full h-full object-cover"
          src={mod.chapter_image || LEARN_GERMAN_FALLBACK_IMAGE}
          alt={mod.title}
          loading="eager"
          decoding="async"
        />
      </div>
      <div className="flex flex-col items-center gap-3 w-full">
        <div className="flex flex-col items-center gap-1.5 w-full">
          <div className="px-2 py-0.5 bg-black/10 rounded-[10px]">
            <span className="text-black/60 text-[10px] font-medium">
              Level {displayId}
            </span>
          </div>
          <div className="text-center text-black text-[15px] font-bold leading-tight">
            {mod.title}
          </div>
        </div>
        <motion.button
          className="w-full bg-white rounded-[10px] shadow-[0px_3px_8px_0px_rgba(0,0,0,0.25)] flex justify-center items-center active:scale-95 transition-colors overflow-hidden whitespace-nowrap"
          initial={
            isBeingUnlocked ? { height: 0, opacity: 0, marginTop: -12 } : false
          }
          animate={
            isBeingUnlocked
              ? { height: 36, opacity: 1, marginTop: 0 }
              : isFadingOut
                ? { height: 36, opacity: 1, marginTop: 0 }
                : { height: 36, opacity: 1, marginTop: 0 }
          }
          transition={{
            duration: 0.5,
            ease: "easeInOut",
            delay: isBeingUnlocked ? 0.3 : isFadingOut ? 0.6 : 0,
          }}
        >
          <motion.span
            animate={isFadingOut ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-black text-sm font-semibold"
          >
            {btnText}
          </motion.span>
        </motion.button>
      </div>
    </div>
  );
}

function LockedCardContent({ mod, displayId }) {
  return (
    <div className="w-[200px] h-full px-2.5 pt-2.5 pb-3 bg-gradient-to-br from-neutral-200 to-zinc-400 rounded-[20px] shadow-[2px_2px_4px_0px_rgba(0,0,0,0.25)] outline-[5px] outline-offset-[-5px] outline-white flex flex-col items-center gap-2.5">
      <div className="absolute right-0 -top-3 size-8 bg-white rounded-full flex items-center justify-center shadow-md z-20 outline-[3px] outline-white/50">
        <Lock className="w-4 h-4 text-zinc-500" />
      </div>
      <div className="w-full h-28 overflow-hidden rounded-[10px]">
        <img
          className="w-full h-full object-cover opacity-60 grayscale"
          src={mod.chapter_image || LEARN_GERMAN_FALLBACK_IMAGE}
          alt={mod.title}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="flex flex-col items-center gap-1.5 w-full">
        <div className="px-2 py-0.5 bg-black/10 rounded-[10px]">
          <span className="text-black/40 text-[10px] font-medium">
            Level {displayId}
          </span>
        </div>
        <div className="text-center text-black text-sm font-semibold opacity-50 px-2 leading-tight">
          {mod.title}
        </div>
      </div>
    </div>
  );
}

// --- Timeline animation helpers (module-level, no component deps) ---

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scrollToElement(el) {
  return new Promise((resolve) => {
    if (!el) {
      resolve();
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      observer.disconnect();
      clearTimeout(safety);
      resolve();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) done();
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    // Safety: resolve after 2s even if observer never fires
    const safety = setTimeout(done, 2000);
  });
}

export default function LearnGermanHome() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [modules, setModules] = useState([]);
  const [vocabProgress, setVocabProgress] = useState({
    totalWords: 0,
    learnedWords: 0,
    progressRatio: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showDailyGoal, setShowDailyGoal] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [streakUpdated, setStreakUpdated] = useState(false);
  const [coinsAwarded, setCoinsAwarded] = useState(0);
  const [vocabWordCount, setVocabWordCount] = useState(0);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [restartLesson, setRestartLesson] = useState(null);
  const activeLessonRef = useRef(null);
  const suppressStartGoalForVisitRef = useRef(false);
  const [showFirstChapterGuide, setShowFirstChapterGuide] = useState(false);
  const [tourStep, setTourStep] = useState(0); // 0 = BottomSwitcher, 1 = ChapterCard
  const [firstChapterGuideRect, setFirstChapterGuideRect] = useState(null);
  const [switcherGuideRect, setSwitcherGuideRect] = useState(null);

  // Timeline completion animation state
  // phases: "idle" | "marking_complete" | "unlocking_next" | "done"
  const [timelineAnimPhase, setTimelineAnimPhase] = useState("idle");
  const [timelineCompletedId, setTimelineCompletedId] = useState(null);
  const [timelineNextId, setTimelineNextId] = useState(null);
  // Queued animation payload
  const [pendingAnimation, setPendingAnimation] = useState(null);
  // When true, the auto-scroll to activeLessonRef is skipped (animation owns scrolling)
  const hasPendingAnimRef = useRef(false);
  // Captured at mount so cards skip stagger entry animation when returning from a lesson
  const fromLessonCompleteRef = useRef(
    location.state?.fromLessonComplete === true,
  );
  const completedLessonOverrideRef = useRef(
    location.state?.completedLessonId ?? null,
  );

  const [fromSwitcher] = useState(() => {
    return sessionStorage.getItem("lg_animate_switcher") === "true";
  });

  useEffect(() => {
    setClarityTag("lg_funnel", "learn_home");
    setClarityTag("lg_mode", "learn");
    trackClarityEvent(
      "lg_home_viewed",
      {
        lg_funnel: "learn_home",
        lg_mode: "learn",
        lg_from_onboarding: Boolean(location.state?.fromOnboardingFirstLanding),
        lg_from_switcher: fromSwitcher,
        lg_prof_level: user?.user_prof_level || "unknown",
      },
      location.state?.fromOnboardingFirstLanding ? "lg_first_landing" : null,
    );
  }, [
    fromSwitcher,
    location.state?.fromOnboardingFirstLanding,
    user?.user_prof_level,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      sessionStorage.removeItem("lg_animate_switcher");
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const active = showFirstChapterGuide && tourStep === 0;
    if (active) {
      window.dispatchEvent(new CustomEvent("lgTourStart"));
    } else {
      window.dispatchEvent(new CustomEvent("lgTourEnd"));
    }
    return () => {
      window.dispatchEvent(new CustomEvent("lgTourEnd"));
    };
  }, [showFirstChapterGuide, tourStep]);

  const applyCompletedProgressOverride = useCallback(
    (lessons, completedLessonId) => {
      if (completedLessonId == null || !Array.isArray(lessons)) return lessons;
      const completedIdStr = String(completedLessonId);

      return lessons.map((lesson) => {
        if (String(lesson.lesson_id) !== completedIdStr) return lesson;
        return {
          ...lesson,
          user_status: "completed",
          user_screens_completed: Number.MAX_SAFE_INTEGER,
        };
      });
    },
    [],
  );

  const fetchLessons = useCallback(
    async ({ forceFresh = false, completedLessonId = null } = {}) => {
      try {
        if (forceFresh) {
          api.clearGetCache?.();
        }
        if (completedLessonId != null) {
          completedLessonOverrideRef.current = completedLessonId;
        }
        const { data } = await getLessonsList();
        setModules(
          applyCompletedProgressOverride(
            data,
            completedLessonId ?? completedLessonOverrideRef.current,
          ),
        );
        const vocabRes = await getVocabProgress();
        if (vocabRes.data) {
          setVocabProgress(vocabRes.data);
        }
      } catch (err) {
        console.error("Failed to load modules:", err);
      } finally {
        setLoading(false);
      }
    },
    [applyCompletedProgressOverride],
  );

  useEffect(() => {
    const logVisit = async () => {
      try {
        await api.post("/dynamic-lesson/track-visit");
      } catch (err) {
        console.error("Failed to log Learn German visit:", err);
      }
    };
    logVisit();
  }, []);

  useEffect(() => {
    // Seed localStorage if not set yet — for navbar/switcher consistency only
    if (!localStorage.getItem("lg_preferred_mode")) {
      getLGMode()
        .then((res) => {
          const mode = res.data?.mode || "learn";
          localStorage.setItem("lg_preferred_mode", mode);
        })
        .catch(() => {});
    }
    fetchLessons({
      forceFresh: location.state?.fromLessonComplete === true,
      completedLessonId: location.state?.completedLessonId,
    });
  }, [fetchLessons, location.state]);

  // Async animation sequence — owns all scrolling.
  // Uses DOM queries (data-lesson-id) so it works immediately without waiting for React refs.
  const runTimelineAnimation = useCallback(
    async (completedIdStr, foundNextId, autoStartNext) => {
      // Immediately lock IDs so the UI renders the "before" state during scroll
      setTimelineCompletedId(completedIdStr);
      if (foundNextId != null) {
        setTimelineNextId(String(foundNextId));
      }

      // Find the completed card directly in the DOM
      const completedEl = document.querySelector(
        `[data-lesson-id="${completedIdStr}"]`,
      );

      // Scroll to the completed card and wait until it is in the viewport
      if (completedEl) {
        setTimelineAnimPhase("scrolling_to_completed");
        await scrollToElement(completedEl);
        await waitMs(300);
      }

      // Step 3: Animate the completed card
      setTimelineAnimPhase("marking_complete");
      await waitMs(2000); // Increased wait time to accommodate the new 0.6s holding phase

      // Step 4: Scroll to the next card, scroll to it and animate
      if (foundNextId != null) {
        const nextIdStr = String(foundNextId);
        const nextEl = document.querySelector(
          `[data-lesson-id="${nextIdStr}"]`,
        );

        if (nextEl) {
          setTimelineAnimPhase("scrolling_to_next");
          await scrollToElement(nextEl);
          await waitMs(300);
        }

        // Animate the next card (expand + orange ring)
        setTimelineAnimPhase("unlocking_next");
        await waitMs(1300);
      }

      // Done — clear everything
      setTimelineAnimPhase("idle");
      setTimelineCompletedId(null);
      setTimelineNextId(null);
      hasPendingAnimRef.current = false;
      await fetchLessons({
        forceFresh: true,
        completedLessonId: completedIdStr,
      });

      if (autoStartNext && foundNextId != null) {
        navigate(`/learn-german/lesson/${foundNextId}`);
      }
    },
    [fetchLessons, navigate],
  );

  // Show daily goal modal once per day (after data loads)
  useEffect(() => {
    if (loading || !modules.length) return;
    const fromLessonComplete = location.state?.fromLessonComplete === true;
    const isFirstLandingSignal =
      location.state?.fromOnboardingFirstLanding === true ||
      getLgFirstLandingMarker();
    if (isFirstLandingSignal || fromLessonComplete) {
      suppressStartGoalForVisitRef.current = true;
    }
    const shouldSuppressStartGoalThisVisit =
      suppressStartGoalForVisitRef.current;
    const streakFlag = location.state?.streakUpdated === true;
    const awardedCoins = Number.isFinite(Number(location.state?.coinsAwarded))
      ? Number(location.state?.coinsAwarded)
      : 0;

    if (import.meta.env.DEV) {
      console.debug("[LearnGermanHome] modal-gate", {
        isFirstLandingSignal,
        fromLessonComplete,
        shouldSuppressStartGoalThisVisit,
        shouldShowStartGoal: shouldShowDailyGoal(user?.user_id),
      });
    }

    if (isFirstLandingSignal) {
      const stage = getLgGuideStage();
      if (!stage || stage === LG_GUIDE_STAGES.NOT_STARTED) {
        setLgGuideStage(LG_GUIDE_STAGES.NOT_STARTED);
        setShowFirstChapterGuide(true);
      } else if (stage !== LG_GUIDE_STAGES.COMPLETE) {
        setShowFirstChapterGuide(true);
      }
      clearLgFirstLandingMarker();
    }

    if (isFirstLandingSignal) {
      // Suppress both Daily Goal modals on very first post-onboarding landing.
      // Mark as shown so navigating away and back does not re-trigger the modal.
      markDailyGoalShown(user?.user_id);
      setShowCompleted(false);
      setShowDailyGoal(false);
    } else if (fromLessonComplete) {
      setShowDailyGoal(false);
      // Goal was completed — mark the start modal as shown so it never
      // re-appears if the user navigates away and returns the same day.
      markDailyGoalShown(user?.user_id);
      // Capture vocab word count from the completed lesson for the completed modal.
      setVocabWordCount(Number(location.state?.vocabWordCount) || 0);
      // Mark that the animation will own scrolling — suppress auto-scroll
      hasPendingAnimRef.current = true;
      let willShowModal = false;
      // Only show the "daily goal completed" modal once per day.
      if (shouldShowDailyGoalCompleted(user?.user_id)) {
        markDailyGoalCompletedShown(user?.user_id);
        willShowModal = true;
        setShowCompleted(true);
        setStreakUpdated(streakFlag);
        setCoinsAwarded(awardedCoins);
      }
      // Always queue the animation payload — the trigger effect handles
      // waiting for auto-scroll + modal close before firing it
      const rawCompletedId = location.state?.completedLessonId;
      if (rawCompletedId != null) {
        const completedIdStr = String(rawCompletedId);
        const completedIdx = modules.findIndex(
          (m) => String(m.lesson_id) === completedIdStr,
        );
        if (completedIdx !== -1) {
          let foundNextId = null;
          for (let i = completedIdx + 1; i < modules.length; i++) {
            if (modules[i].has_content) {
              foundNextId = modules[i].lesson_id;
              break;
            }
          }
          const autoStartNext = location.state?.autoStartNext === true;
          setPendingAnimation({ completedIdStr, foundNextId, autoStartNext });
        }
      }
    } else if (
      !shouldSuppressStartGoalThisVisit &&
      shouldShowDailyGoal(user?.user_id)
    ) {
      setShowDailyGoal(true);
      markDailyGoalShown(user?.user_id);
    }
    if (location.state && Object.keys(location.state).length > 0) {
      navigate(location.pathname, { replace: true });
    }
  }, [
    loading,
    modules,
    location.state,
    location.pathname,
    navigate,
    user?.user_id,
  ]);

  const progress = useMemo(() => {
    return Math.round((vocabProgress.progressRatio || 0) * 100);
  }, [vocabProgress.progressRatio]);

  // First incomplete lesson with content — shown as the goal in both modals
  const nextLesson = useMemo(() => {
    return (
      modules.find((m) => m.has_content && m.user_status !== "completed") ||
      null
    );
  }, [modules]);

  const activeLessonId = useMemo(() => {
    for (let index = 0; index < modules.length; index += 1) {
      const mod = modules[index];
      if (!mod?.has_content) continue;
      if (mod.user_status === "in_progress") return mod.lesson_id;

      const previousAvailable = modules
        .slice(0, index)
        .filter((lesson) => lesson.has_content);
      const previousLesson = previousAvailable[previousAvailable.length - 1];
      const isPreviousCompleted =
        !previousLesson || previousLesson.user_status === "completed";
      const isActive =
        mod.user_status === "in_progress" ||
        (mod.user_status === "not_started" && isPreviousCompleted);

      if (isActive) return mod.lesson_id;
    }
    return null;
  }, [modules]);

  const activeLesson = useMemo(
    () => modules.find((mod) => mod.lesson_id === activeLessonId) || null,
    [modules, activeLessonId],
  );

  useEffect(() => {
    const imageUrl = activeLesson?.chapter_image || nextLesson?.chapter_image;
    if (!imageUrl) return;
    const img = new Image();
    img.decoding = "async";
    img.src = imageUrl;
  }, [activeLesson?.chapter_image, nextLesson?.chapter_image]);

  useEffect(() => {
    if (
      loading ||
      !modules.length ||
      !activeLessonId ||
      !activeLessonRef.current
    )
      return;
    // When the animation sequence is pending, it owns all scrolling
    if (hasPendingAnimRef.current) return;
    activeLessonRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [loading, modules.length, activeLessonId]);

  // Animation trigger — fires when: data loaded, animation queued, modal dismissed
  useEffect(() => {
    if (loading || !modules.length || !pendingAnimation || showCompleted)
      return;
    const { completedIdStr, foundNextId, autoStartNext } = pendingAnimation;
    setPendingAnimation(null);
    runTimelineAnimation(completedIdStr, foundNextId, autoStartNext);
  }, [loading, modules, pendingAnimation, showCompleted, runTimelineAnimation]);

  useEffect(() => {
    if (!showFirstChapterGuide) {
      setFirstChapterGuideRect(null);
      setSwitcherGuideRect(null);
      return;
    }
    const updateGuideRect = () => {
      // 1. Chapter Card Rect
      const el = activeLessonRef.current;
      if (!el) {
        setFirstChapterGuideRect(null);
      } else {
        const rect = el.getBoundingClientRect();
        setFirstChapterGuideRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }

      // 2. Bottom Mode Switcher Rect
      const switcherEl = document.getElementById("bottom-mode-switcher");
      if (!switcherEl) {
        setSwitcherGuideRect(null);
      } else {
        const rect = switcherEl.getBoundingClientRect();
        setSwitcherGuideRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    };
    updateGuideRect();
    const settleTimers = [250, 650, 1100].map((delay) =>
      window.setTimeout(updateGuideRect, delay),
    );
    window.addEventListener("resize", updateGuideRect);
    window.addEventListener("scroll", updateGuideRect, true);
    return () => {
      settleTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", updateGuideRect);
      window.removeEventListener("scroll", updateGuideRect, true);
    };
  }, [showFirstChapterGuide, modules.length, activeLessonId]);

  const handleStart = (lesson_id, status, hasContent) => {
    if (!hasContent) return;
    trackClarityEvent(
      "lg_lesson_card_clicked",
      {
        lg_funnel: "learn_home",
        lg_lesson_id: lesson_id,
        lg_lesson_status: status || "unknown",
        lg_lesson_action:
          status === "completed" ? "restart_prompt" : "start_or_continue",
      },
      status === "completed" ? null : "lg_lesson_started",
    );
    if (lesson_id === activeLessonId) {
      const stage = getLgGuideStage();
      if (!stage || stage === LG_GUIDE_STAGES.NOT_STARTED) {
        setLgGuideStage(LG_GUIDE_STAGES.CHAPTER_CLICK_DONE);
        setShowFirstChapterGuide(false);
      }
    }
    if (status === "completed") {
      const lesson = modules.find((m) => m.lesson_id === lesson_id) || null;
      setRestartLesson(lesson);
      setShowRestartModal(true);
    } else {
      navigate(`/learn-german/lesson/${lesson_id}`);
    }
  };

  const handleRestartConfirm = () => {
    if (!restartLesson?.lesson_id) return;
    setShowRestartModal(false);
    navigate(`/learn-german/lesson/${restartLesson.lesson_id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-sky-100 relative pb-32 overflow-x-hidden">
      <CityBackground fromSwitcher={fromSwitcher} />

      <motion.div
        initial={fromSwitcher ? { opacity: 0, y: 80 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="w-full max-w-[400px] mx-auto relative z-10 flex flex-col items-center px-6"
      >
        {/* Top Arc Progress Section */}
        <div className="w-full mb-6 mt-4 relative flex flex-col items-center">
          <div
            onClick={() => navigate("/learn-german/recap")}
            className="w-full p-4 bg-white rounded-2xl inline-flex flex-col justify-start items-start gap-2.5 shadow-lg border border-[#efefef] cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <div className="self-stretch flex flex-col justify-start items-start gap-2">
              <div className="self-stretch inline-flex justify-between items-center px-1">
                <div className="w-48 justify-start text-blue-950 text-base font-normal">
                  German words learnt
                </div>
                <div className="text-right justify-start text-blue-950 text-base font-semibold">
                  {vocabProgress.learnedWords}
                </div>
              </div>
              <div className="self-stretch h-[18px] bg-[#505050] rounded-full relative overflow-visible border border-[#303030] p-[2px] flex items-center">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r from-[#F9786F] to-[#FFD475] `}
                  initial={
                    fromSwitcher
                      ? { width: 0 }
                      : { width: `${Math.min(100, Math.max(0, progress))}%` }
                  }
                  animate={{
                    width: `${Math.min(100, Math.max(0, progress))}%`,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 70,
                    damping: 10,
                    delay: 0.3,
                  }}
                />
                <div className="absolute right-[-4px] size-8 bg-white rounded-full shadow-[0px_2px_5px_0px_rgba(0,0,0,0.20)] flex items-center justify-center select-none overflow-hidden border border-gray-100">
                  <img
                    src={germanFlag}
                    alt="German Flag"
                    className="w-6 h-6 object-cover rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Zigzag Module List */}
        <div className="w-full flex flex-col gap-12 relative z-10">
          {loading ? (
            <div className="text-center text-slate-500 font-medium py-8">
              Loading modules...
            </div>
          ) : modules.length === 0 ? (
            <div className="text-center text-slate-500 font-medium py-8">
              No modules available.
            </div>
          ) : (
            modules.map((mod, index) => {
              const displayId = index + 1;
              const isUnavailable = !mod.has_content;
              const isCompleted = mod.user_status === "completed";

              const previousAvailable = modules
                .slice(0, index)
                .filter((lesson) => lesson.has_content);
              const previousLesson =
                previousAvailable[previousAvailable.length - 1];
              const isPreviousCompleted =
                !previousLesson || previousLesson.user_status === "completed";

              const isActive =
                !isUnavailable &&
                (mod.user_status === "in_progress" ||
                  (mod.user_status === "not_started" && isPreviousCompleted));

              const isLocked = isUnavailable || (!isCompleted && !isActive);
              const isLeft = index % 2 === 0;

              let btnText = "Start challenge";
              if (mod.user_status === "in_progress")
                btnText = "Continue challenge";

              // Animation flags for this card
              const isCompletedCard =
                timelineCompletedId === String(mod.lesson_id);
              const isNextCard = timelineNextId === String(mod.lesson_id);

              const isBeingMarkedComplete =
                isCompletedCard && timelineAnimPhase === "marking_complete";
              const isPreComplete =
                isCompletedCard &&
                timelineAnimPhase === "scrolling_to_completed";

              const isBeingUnlocked =
                isNextCard && timelineAnimPhase === "unlocking_next";
              const isPreUnlock =
                isNextCard &&
                (timelineAnimPhase === "scrolling_to_completed" ||
                  timelineAnimPhase === "marking_complete" ||
                  timelineAnimPhase === "scrolling_to_next");

              return (
                <div
                  key={mod.lesson_id}
                  className={`relative flex w-full ${
                    isLeft ? "justify-start" : "justify-end"
                  }`}
                >
                  {/* Road Path to next module */}
                  {index < modules.length - 1 && (
                    <RoadSegment
                      direction={isLeft ? "left-to-right" : "right-to-left"}
                    />
                  )}

                  {/* Card Component */}
                  <motion.div
                    layout
                    data-lesson-id={mod.lesson_id}
                    ref={
                      mod.lesson_id === activeLessonId ? activeLessonRef : null
                    }
                    data-lg-first-chapter-target={
                      mod.lesson_id === activeLessonId ? "true" : undefined
                    }
                    initial={
                      fromSwitcher
                        ? { opacity: 0, y: 50 }
                        : fromLessonCompleteRef.current
                          ? false
                          : { opacity: 0, y: 20 }
                    }
                    animate={
                      isBeingMarkedComplete
                        ? {
                            opacity: 1,
                            x: 0,
                            y: 0,
                            scale: [1, 1.02, 1],
                            filter: "none",
                            rotate: 0,
                          }
                        : isBeingUnlocked
                          ? {
                              opacity: 1,
                              x: 0,
                              y: [15, -5, 0],
                              scale: [0.95, 1.02, 1],
                              filter: "none",
                              rotate: 0,
                            }
                          : {
                              opacity: 1,
                              x: 0,
                              y: 0,
                              scale: 1,
                              filter: "none",
                              rotate: 0,
                            }
                    }
                    transition={
                      fromSwitcher
                        ? {
                            type: "spring",
                            stiffness: 120,
                            damping: 12,
                            delay: index * 0.08,
                          }
                        : isBeingMarkedComplete
                          ? { duration: 0.6, ease: "easeOut" }
                          : isBeingUnlocked
                            ? { duration: 0.9, ease: "easeOut" }
                            : fromLessonCompleteRef.current
                              ? { duration: 0 }
                              : { delay: index * 0.1 }
                    }
                    onClick={() =>
                      !isLocked &&
                      !isCompleted &&
                      handleStart(
                        mod.lesson_id,
                        mod.user_status,
                        mod.has_content,
                      )
                    }
                    className={`relative ${
                      !isLocked && "cursor-pointer hover:scale-[1.02]"
                    }`}
                  >
                    {isBeingMarkedComplete ? (
                      <div className="relative">
                        <ActiveCardContent
                          mod={mod}
                          displayId={displayId}
                          btnText="Continue challenge"
                          isFadingOut={true}
                        />
                        <motion.div
                          className="absolute inset-0 z-50 origin-center pointer-events-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{
                            duration: 0.5,
                            ease: "easeOut",
                            delay: 0.6,
                          }}
                        >
                          <CompletedCardContent
                            mod={mod}
                            displayId={displayId}
                            isBeingMarkedComplete={true}
                            onRestart={() =>
                              handleStart(
                                mod.lesson_id,
                                "completed",
                                mod.has_content,
                              )
                            }
                            onRecap={() =>
                              navigate(`/learn-german/recap/${mod.lesson_id}`)
                            }
                          />
                        </motion.div>
                      </div>
                    ) : isPreComplete ? (
                      <ActiveCardContent
                        mod={mod}
                        displayId={displayId}
                        btnText="Continue challenge"
                      />
                    ) : isBeingUnlocked ? (
                      <div className="relative">
                        <ActiveCardContent
                          mod={mod}
                          displayId={displayId}
                          btnText="Start challenge"
                          isBeingUnlocked={true}
                        />
                        <motion.div
                          className="absolute inset-0 z-50 origin-center pointer-events-none"
                          initial={{ opacity: 1 }}
                          animate={{ opacity: 0 }}
                          transition={{
                            duration: 0.5,
                            ease: "easeOut",
                            delay: 0.1,
                          }}
                        >
                          <LockedCardContent mod={mod} displayId={displayId} />
                        </motion.div>
                      </div>
                    ) : isPreUnlock ? (
                      <LockedCardContent mod={mod} displayId={displayId} />
                    ) : isCompleted ? (
                      <CompletedCardContent
                        mod={mod}
                        displayId={displayId}
                        onRestart={() =>
                          handleStart(
                            mod.lesson_id,
                            "completed",
                            mod.has_content,
                          )
                        }
                        onRecap={() =>
                          navigate(`/learn-german/recap/${mod.lesson_id}`)
                        }
                      />
                    ) : isActive ? (
                      <ActiveCardContent
                        mod={mod}
                        displayId={displayId}
                        btnText={btnText}
                      />
                    ) : (
                      <LockedCardContent mod={mod} displayId={displayId} />
                    )}
                  </motion.div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* STEP 0: Mode Switcher */}
      {showFirstChapterGuide && tourStep === 0 && switcherGuideRect && (
        <GuideSpotlight
          rect={switcherGuideRect}
          radius={30}
          onClick={() => setTourStep(1)}
        >
          <p className="relative text-[15px] font-bold leading-snug text-slate-950">
            Switch between Guided Learning and Exam Practice.
          </p>
          <p className="relative mt-1 text-[12px] font-medium leading-snug text-slate-500">
            Test out your German skills and apply what you've learned. Tap
            anywhere to continue.
          </p>
        </GuideSpotlight>
      )}

      {/* STEP 1: First Chapter Card */}
      {showFirstChapterGuide && tourStep === 1 && firstChapterGuideRect && (
        <GuideSpotlight
          rect={firstChapterGuideRect}
          radius={24}
          onClick={() => {
            setShowFirstChapterGuide(false);
            setTourStep(0);
            handleStart(
              activeLessonId,
              activeLesson?.user_status || "in_progress",
              activeLesson?.has_content !== false,
            );
          }}
        >
          <p className="relative text-[15px] font-bold leading-snug text-slate-950">
            Start here with your first German chapter.
          </p>
          <p className="relative mt-1 text-[12px] font-medium leading-snug text-slate-500">
            Tap the highlighted card to begin.
          </p>
        </GuideSpotlight>
      )}

      {/* Daily Goal Modal — shown once per day */}
      <DailyGoalModal
        isOpen={showDailyGoal}
        onClose={() => setShowDailyGoal(false)}
        nextLesson={nextLesson}
        userId={user?.user_id}
        vocabWordCount={nextLesson?.vocab_count ?? 0}
      />

      {/* Daily Goal Completed Modal — shown after finishing a lesson */}
      <DailyGoalCompletedModal
        isOpen={showCompleted}
        onClose={() => setShowCompleted(false)}
        nextLesson={nextLesson}
        streakUpdated={streakUpdated}
        coinsAwarded={coinsAwarded}
        vocabWordCount={vocabWordCount}
      />

      <RestartLessonModal
        isOpen={showRestartModal}
        chapterTitle={restartLesson?.title}
        onClose={() => setShowRestartModal(false)}
        onRestart={handleRestartConfirm}
      />

      {/* SVG gooey filter definition for completed card button morph */}
      <svg
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          pointerEvents: "none",
        }}
      >
        <defs>
          <filter id="recap-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
