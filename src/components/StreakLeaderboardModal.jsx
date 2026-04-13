import { useMemo, useEffect, useState, useRef } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  animate,
} from "framer-motion";
import {
  Award,
  Crown,
  Flame,
  Sparkles,
  Trophy,
  X,
  Star,
  TrendingUp,
  Rocket,
  RotateCcw,
  HeartCrack,
  Heart,
} from "lucide-react";


function LoadingState() {
  return (
    <div className="space-y-2.5">
      <div className="h-[140px] w-full rounded-[22px] bg-slate-100 animate-pulse" />
      <div className="space-y-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-[48px] w-full rounded-[14px] bg-slate-100 animate-pulse"
          />
        ))}
      </div>
      <div className="h-[56px] w-full rounded-[16px] bg-slate-100 animate-pulse mt-3" />
    </div>
  );
}

const GodRays = () => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
    className="absolute -top-[150%] -bottom-[150%] -left-[150%] -right-[150%] z-0 pointer-events-none opacity-40 mix-blend-overlay"
    style={{
      background:
        "repeating-conic-gradient(from 0deg, transparent 0 15deg, #FFD700 15deg 30deg)",
    }}
  />
);

function StreakRestoredOverlay() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 4.2, times: [0, 0.85, 1], ease: "easeOut" }}
      className="absolute inset-0 z-50 flex items-center px-4 overflow-hidden rounded-[16px] pointer-events-none"
    >
      {/* Sleek, premium background transition from cool grey to warm success glow */}
      <motion.div
        initial={{ backgroundColor: "#f8fafc" }}
        animate={{ backgroundColor: ["#f8fafc", "#fff7ed", "#ffffff"] }}
        transition={{ duration: 3.5, times: [0, 0.6, 1], ease: "easeOut" }}
        className="absolute inset-0 -z-10 shadow-inner"
      />

      {/* Sweeping laser over background */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "200%" }}
        transition={{ duration: 1.5, delay: 0.8, ease: "easeInOut" }}
        className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent skew-x-12 z-0 pointer-events-none"
      />

      <div className="flex items-center gap-3 relative z-10 w-full">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
          {/* 1. Broken Heart (Slate) explodes */}
          <motion.div
            initial={{ opacity: 1, scale: 1, rotate: -10 }}
            animate={{ opacity: 0, scale: 1.5, filter: "blur(4px)" }}
            transition={{ duration: 0.6, delay: 0.6, ease: "easeIn" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <HeartCrack size={26} className="text-slate-400" />
          </motion.div>

          {/* 2. Cured Heart (Rose) flashes */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0.5, 1.2, 1.5],
              filter: ["blur(4px)", "blur(0px)", "blur(4px)"],
            }}
            transition={{ duration: 1.0, delay: 1.1, times: [0, 0.4, 1] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Heart
              size={28}
              className="text-rose-500 drop-shadow-sm"
              fill="#f43f5e"
            />
          </motion.div>

          {/* 3. Golden Flame (Final State) reveals and stays */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.3, 1], opacity: 1 }}
            transition={{
              delay: 1.8,
              duration: 0.8,
              type: "spring",
              damping: 12,
            }}
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-400 to-red-500 rounded-[12px] shadow-[0_4px_10px_rgba(249,115,22,0.3)] border border-orange-200"
          >
            <Flame
              size={22}
              className="text-white drop-shadow-sm"
              fill="currentColor"
            />
          </motion.div>
        </div>

        <div className="flex flex-col relative w-full h-10 ml-1">
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0, y: -5 }}
            transition={{ delay: 1.0, duration: 0.3 }}
            className="absolute top-1 left-0"
          >
            <p className="text-[17px] font-black tracking-tight text-slate-400 uppercase">
              Recovering...
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: [0, 1, 0.9], y: [10, 0, 0] }}
            transition={{ delay: 1.2, duration: 1.6, times: [0, 0.2, 1] }}
            className="absolute top-0 left-0 whitespace-nowrap"
          >
            <p className="text-[18px] font-black tracking-tight text-orange-600 uppercase drop-shadow-sm">
              STREAK RESTORED!
            </p>
            <p className="text-[11px] font-extrabold text-orange-400 uppercase tracking-[0.2em] mt-0.5">
              Momentum Regained
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function AnimatedCounter({ from, to, delay = 0 }) {
  const nodeRef = useRef(null);
  useEffect(() => {
    if (from === to) return;
    const safeFrom = from === Infinity || from === 0 ? to + 50 : from;
    const controls = animate(safeFrom, to, {
      duration: 1.8,
      delay,
      ease: "easeOut",
      onUpdate(value) {
        if (nodeRef.current)
          nodeRef.current.textContent = `#${Math.floor(value)}`;
      },
    });
    return () => controls.stop();
  }, [from, to, delay]);
  return <span ref={nodeRef}>#{from === Infinity ? to : from}</span>;
}

// Fixed visual ambiguity: removed the generic medal icons and display precise numbers
function RankTicker({ oldRank, newRank }) {
  const [display, setDisplay] = useState(oldRank);

  useEffect(() => {
    if (oldRank === newRank) return;
    const diff = Math.abs(oldRank - newRank);
    if (diff === 0) return;
    const direction = oldRank > newRank ? -1 : 1;
    const timePerTick = 1400 / diff;

    let current = oldRank;
    const t1 = setTimeout(() => {
      current += direction;
      setDisplay(current);

      if (current !== newRank) {
        const t2 = setInterval(() => {
          current += direction;
          setDisplay(current);
          if (current === newRank) clearInterval(t2);
        }, timePerTick);
        return () => clearInterval(t2);
      }
    }, 1200 + timePerTick * 0.4);

    return () => clearTimeout(t1);
  }, [oldRank, newRank]);

  return (
    <div
      className={`w-[28px] h-[28px] shrink-0 rounded-full flex flex-col items-center justify-center shadow-inner ${
        display === 2
          ? "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 border border-slate-300 shadow-slate-300/50"
          : display === 3
          ? "bg-gradient-to-br from-[#FFE8D6] to-[#FFD2B3] text-[#B87333] border border-[#ECA472] shadow-orange-300/50"
          : "bg-slate-100 text-slate-500 border border-slate-200"
      }`}
    >
      <span className="text-[12px] font-black tracking-tighter drop-shadow-sm">
        #{display}
      </span>
    </div>
  );
}

function FloatingSparkles({ isChampionJump }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[22px]">
      <motion.div
        animate={{
          y: [0, -8, 0],
          opacity: [0.3, 1, 0.3],
          scale: [0.8, 1.15, 0.8],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-2 left-5 text-yellow-500"
      >
        <Sparkles size={18} fill="currentColor" />
      </motion.div>
      <motion.div
        animate={{
          y: [0, -10, 0],
          opacity: [0.2, 0.8, 0.2],
          scale: [0.7, 1.05, 0.7],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="absolute bottom-3 right-6 text-yellow-400"
      >
        <Sparkles size={22} fill="currentColor" />
      </motion.div>
      <motion.div
        animate={{
          scale: [1, 1.35, 1],
          opacity: [0.3, 1, 0.3],
          rotate: [0, 45, 0],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
        className="absolute top-1/2 right-4 text-orange-400"
      >
        <Star size={12} fill="currentColor" />
      </motion.div>
    </div>
  );
}

function TopSpotlight({
  entry,
  isMe,
  shouldReduceMotion,
  isNewChampion,
  animState,
}) {
  if (!entry || entry.waiting) {
    return (
      <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[12px] text-slate-500 font-medium z-10 relative">
        No streak leader yet today.
      </div>
    );
  }
  // Determine if it's currently morphing so we can fade content
  const isUpgradingToNum1 =
    isNewChampion && animState.oldRank > 1 && animState.oldRank <= 5;
  const isUpgradingFromOutside = isMe && isNewChampion && animState.oldRank > 5;
  const oldRankPixelY = isUpgradingToNum1
    ? 120 + (animState.oldRank - 2) * 64
    : -50;

  // Dynamically size the hardcoded boundary based on whether the massive Red Pill will render at the bottom
  const targetBoxHeight = isMe ? 250 : 200;

  return (
    <div className="relative z-40 w-full mb-2">
      {isNewChampion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ delay: 1.4, duration: 4, ease: "easeInOut" }}
          className="fixed inset-[-100%] bg-slate-950 pointer-events-none z-30"
          style={{ mixBlendMode: "multiply" }}
        />
      )}

      {/* Underlying Placeholder skeleton exclusively for laser stamp scanning mode */}
      {isUpgradingFromOutside && (
        <div
          className="absolute top-0 left-0 right-0 bg-slate-50 border border-slate-100 border-dashed rounded-[24px] pointer-events-none z-0"
          style={{ height: targetBoxHeight }}
        />
      )}

      {/* The Main #1 Container with explicit CSS shape-shifting morph and restored styling */}
      <motion.div
        initial={
          isUpgradingToNum1
            ? { height: 56, y: oldRankPixelY, borderRadius: 14 }
            : isUpgradingFromOutside && !shouldReduceMotion
            ? { clipPath: "inset(0% 100% 0% 0%)", height: targetBoxHeight }
            : !shouldReduceMotion
            ? {
                scale: 0.9,
                rotateX: -30,
                opacity: 0,
                y: -30,
                filter: "blur(10px)",
                height: targetBoxHeight,
              }
            : { height: targetBoxHeight }
        }
        animate={
          isUpgradingToNum1
            ? { height: targetBoxHeight, y: 0, borderRadius: 24 }
            : isUpgradingFromOutside && !shouldReduceMotion
            ? { clipPath: "inset(0% 0% 0% 0%)", height: targetBoxHeight }
            : {
                scale: 1,
                rotateX: 0,
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                height: targetBoxHeight,
              }
        }
        transition={
          isUpgradingFromOutside
            ? { delay: 1.2, duration: 1.2, ease: "easeInOut" }
            : {
                type: "spring",
                stiffness: 150,
                damping: isUpgradingToNum1 ? 20 : 18,
                mass: 1,
              }
        }
        style={
          !isUpgradingToNum1 && !isUpgradingFromOutside
            ? { perspective: 1000, transformStyle: "preserve-3d" }
            : undefined
        }
        className={`relative overflow-hidden w-full rounded-[24px] bg-gradient-to-br from-[#FFFAEB] via-[#FFF4CC] to-[#FFE57F] border-2 border-[#FFD700] shadow-[0_15px_35px_rgba(255,215,0,0.3)] z-40 ${
          isMe && !isUpgradingFromOutside
            ? "ring-4 ring-yellow-400/50 ring-offset-2"
            : ""
        }`}
      >
        {/* Laser Scanner Line Tracker for Stamp Creation */}
        {isUpgradingFromOutside && (
          <motion.div
            animate={{ opacity: [1, 1, 0] }}
            transition={{
              delay: 1.2,
              duration: 1.2,
              times: [0, 0.85, 1],
              ease: "linear",
            }}
            className="absolute top-0 bottom-0 right-0 w-2.5 bg-yellow-300 shadow-[0_0_20px_5px_rgba(253,224,71,0.9)] z-[100] pointer-events-none"
          />
        )}

        {/* Rigidly dimensioned Ghost rank row UI prevents internal text-squish during frame expansion */}
        {isUpgradingToNum1 && (
          <motion.div
            animate={{ opacity: [1, 1, 0] }}
            transition={{ duration: 1.0, times: [0, 0.4, 1], ease: "easeOut" }}
            className="absolute top-0 left-0 right-0 flex items-center justify-between p-2 z-[60] bg-blue-50 pointer-events-none rounded-[14px] border border-blue-200 ring-1 ring-blue-300 shadow-sm"
            style={{ height: 56, overflow: "hidden" }}
          >
            <div className="flex items-center gap-2.5 relative z-20">
              {animState.oldRank === 2 ? (
                <div className="w-[28px] h-[28px] shrink-0 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 flex items-center justify-center border border-slate-300 shadow-sm">
                  <span className="text-[12px] font-black tracking-tighter drop-shadow-sm">
                    #2
                  </span>
                </div>
              ) : animState.oldRank === 3 ? (
                <div className="w-[28px] h-[28px] shrink-0 rounded-full bg-gradient-to-br from-[#FFE8D6] to-[#FFD2B3] text-[#B87333] flex items-center justify-center border border-[#ECA472] shadow-sm">
                  <span className="text-[12px] font-black tracking-tighter drop-shadow-sm">
                    #3
                  </span>
                </div>
              ) : (
                <div className="w-[28px] h-[28px] shrink-0 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-[12px] border border-slate-200 shadow-inner">
                  #{animState.oldRank}
                </div>
              )}
              <div className="flex flex-col pt-0.5">
                <span className="text-[13px] font-extrabold text-blue-900 leading-tight truncate">
                  {entry.username}
                </span>
                <span className="text-[9px] font-bold text-blue-400/80 uppercase tracking-widest mt-0.5">
                  {entry.user_prof_level || "Learner"}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end whitespace-nowrap shrink-0 relative z-20">
              <div className="flex items-center gap-1.5 bg-white/60 px-[7px] py-[3px] rounded-[10px] border border-blue-100 shadow-sm">
                <Flame size={13} className="text-orange-500" fill="#f97316" />
                <span className="font-black text-blue-900 text-[13px]">
                  {entry.current_streak || 1}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* We wrap inner content in a fade layer so it seamlessly blooms underneath the ghost mask */}
        <motion.div
          initial={isUpgradingToNum1 ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="px-4 py-4 w-full h-full relative"
        >
          {isNewChampion && <GodRays />}

          {/* Cinematic Glint Sweeps across the card */}
          {isNewChampion && (
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{ delay: 2.2, duration: 1.2, ease: "easeInOut" }}
              className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white to-transparent skew-x-12 opacity-80 z-20 pointer-events-none"
            />
          )}

          <div className="absolute -top-6 -right-6 w-32 h-32 bg-yellow-400/40 rounded-full blur-[30px] pointer-events-none z-0" />
          <div className="absolute top-0 right-0 p-2 opacity-20 pointer-events-none transform translate-x-1/4 -translate-y-1/4 z-0">
            <Crown size={110} className="text-yellow-600 drop-shadow-md" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">
            <motion.div
              initial={isNewChampion ? { scale: 0, rotate: -180 } : false}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                delay: 2.0,
                type: "spring",
                damping: 12,
                stiffness: 200,
              }}
              className="mb-1.5 text-center flex flex-col items-center"
            >
              <div className="bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 p-3 rounded-full shadow-[0_5px_15px_rgba(202,138,4,0.5)] border-2 border-white/80 ring-4 ring-yellow-200/50">
                <Crown
                  size={26}
                  className="text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]"
                  fill="currentColor"
                />
              </div>
            </motion.div>

            <h3 className="text-[20px] font-black text-[#715403] tracking-tight mb-0.5 max-w-[90%] truncate leading-tight drop-shadow-sm">
              {entry.username}
            </h3>
            <span className="text-[11px] font-extrabold text-yellow-700/80 uppercase tracking-[0.2em] mb-3 bg-yellow-400/20 px-2 py-0.5 rounded-full border border-yellow-500/20">
              {entry.user_prof_level || "Learner"}
            </span>

            <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-[14px] shadow-lg border border-yellow-200">
              <Flame
                className="text-orange-500 drop-shadow-sm"
                fill="#f97316"
                size={24}
              />
              <span
                className="font-black text-[30px] text-orange-600 tracking-tighter leading-none"
                style={{ textShadow: "0 2px 4px rgba(249,115,22,0.2)" }}
              >
                {entry.current_streak || 1}
              </span>
              <span className="text-[12px] font-black text-orange-500/80 ml-0.5 uppercase tracking-wider mt-1.5">
                Days
              </span>
            </div>

            <AnimatePresence>
              {isMe && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 5 }}
                  animate={
                    isNewChampion
                      ? { scale: [1, 1.1, 1], opacity: 1, y: 0 }
                      : { scale: 1, opacity: 1, y: 0 }
                  }
                  transition={{
                    repeat: isNewChampion ? Infinity : 0,
                    duration: 2,
                    ease: "easeInOut",
                    delay: isNewChampion ? 2.5 : 0,
                  }}
                  className="mt-3.5 flex items-center gap-1.5 text-[10px] font-black text-white bg-gradient-to-r from-orange-500 to-red-500 px-3.5 py-2 rounded-full border border-white uppercase tracking-widest shadow-[0_4px_12px_rgba(249,115,22,0.4)]"
                >
                  {isNewChampion && (
                    <Rocket size={14} className="text-yellow-200" />
                  )}
                  {isNewChampion
                    ? "RANK #1 UNLOCKED!"
                    : "You are the champion!"}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function RankRow({
  displayRank,
  entry,
  isMe,
  shouldReduceMotion,
  isNewEntrance,
  initialY,
  targetY,
  tickerValues,
  animState,
  renderWindowStart,
}) {
  // Replaced generic medals with explicit numbers for clarity
  const renderRankBadge = () => {
    switch (displayRank) {
      case 2:
        return (
          <div className="w-[28px] h-[28px] shrink-0 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 flex items-center justify-center border border-slate-300 shadow-sm">
            <span className="text-[12px] font-black tracking-tighter drop-shadow-sm">
              #2
            </span>
          </div>
        );
      case 3:
        return (
          <div className="w-[28px] h-[28px] shrink-0 rounded-full bg-gradient-to-br from-[#FFE8D6] to-[#FFD2B3] text-[#B87333] flex items-center justify-center border border-[#ECA472] shadow-sm">
            <span className="text-[12px] font-black tracking-tighter drop-shadow-sm">
              #3
            </span>
          </div>
        );
      default:
        return (
          <div className="w-[28px] h-[28px] shrink-0 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 shadow-inner">
            <span className="text-[12px] font-black tracking-tighter drop-shadow-sm">
              #{displayRank}
            </span>
          </div>
        );
    }
  };

  if (!entry || entry.waiting) {
    return (
      <div
        style={{
          position: "absolute",
          top: targetY,
          left: 0,
          right: 0,
          height: 56,
        }}
        className="flex items-center justify-between p-2 rounded-[14px] bg-slate-50 border border-slate-100/80"
      >
        <div className="flex items-center gap-2.5 opacity-50">
          {renderRankBadge()}
          <span className="text-[13px] font-medium text-slate-400">
            Waiting for the Challenger
          </span>
        </div>
      </div>
    );
  }

  const isStampMode = isMe && isNewEntrance;
  const isDragging = isMe && initialY !== targetY && !isNewEntrance;
  // Transformation trigger if leaving #1
  const isFallingFromNum1 =
    isMe && animState?.oldRank === 1 && animState?.diff < 0;

  // Is this row engaging in a cross-component shape-shift morph?
  const isMorphing = isFallingFromNum1;
  const isHugeJump = Math.abs(animState?.diff || 0) > 3 && !animState.brokenStreak;
  const isNewMountingNPC = !isMe && !isMorphing && !entry?.empty;
  const ghostBoxHeight = isMe ? 250 : 200;

  if (isStampMode) {
    return (
      <div
        style={{
          position: "absolute",
          top: targetY,
          left: 0,
          right: 0,
          height: 56,
        }}
        className="rounded-[14px] overflow-hidden"
      >
        <div className="absolute inset-0 bg-slate-50 border border-slate-100 rounded-[14px]"></div>
        <motion.div
          initial={{ clipPath: "inset(0% 100% 0% 0%)" }}
          animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
          transition={{ delay: 1.2, duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0 bg-blue-50 border-2 border-blue-200 shadow-sm rounded-[14px] ring-1 ring-blue-300 z-10"
        >
          <motion.div
            animate={{ opacity: [1, 1, 0] }}
            transition={{
              delay: 1.2,
              duration: 1.2,
              times: [0, 0.85, 1],
              ease: "linear",
            }}
            className="absolute top-0 bottom-0 right-0 w-1.5 bg-blue-400 shadow-[0_0_15px_4px_rgba(96,165,250,0.8)] z-30 pointer-events-none"
          />
          <div className="flex items-center justify-between p-2 h-full z-20 relative">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              {renderRankBadge()}
              <div className="min-w-0 flex flex-col pt-0.5">
                <span className="text-[13px] font-extrabold text-blue-900 truncate leading-tight">
                  {entry.username}
                </span>
                <span className="text-[9px] font-bold text-blue-400/80 uppercase tracking-widest mt-0.5">
                  {entry.user_prof_level || "Learner"}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end whitespace-nowrap shrink-0">
              <div className="flex items-center gap-1.5 bg-white/60 px-[7px] py-[3px] rounded-[10px] border border-blue-100">
                <Flame size={13} className="text-orange-500" fill="#f97316" />
                <span className="font-black text-blue-900 text-[13px]">
                  {entry.current_streak || 1}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  let renderInitialOpacity = 1;
  if (isNewMountingNPC && isHugeJump) {
     renderInitialOpacity = 0;
  } else if (isDragging && isHugeJump) {
     renderInitialOpacity = 0;
  }

  const movementDelay = isDragging ? (isHugeJump ? 0.4 : 0.1) : (isHugeJump ? 0.1 : 0.1);
  const opacityDelay = 0;

  return (
    <motion.div
      initial={
        isMorphing
          ? { height: ghostBoxHeight, y: -120, borderRadius: 24, zIndex: 50 }
          : !shouldReduceMotion
          ? { height: 56, y: initialY, opacity: renderInitialOpacity }
          : false
      }
      animate={
        isMorphing
          ? { height: 56, y: targetY, borderRadius: 14, zIndex: 10 }
          : {
              height: 56,
              y: targetY,
              opacity: 1,
              scale: !shouldReduceMotion && isDragging ? [1, 1.05, 1.05, 1] : 1,
              boxShadow:
                !shouldReduceMotion && isDragging
                  ? [
                      "0px 1px 2px rgba(0,0,0,0.05)",
                      "0px 20px 25px rgba(59,130,246,0.3)",
                      "0px 20px 25px rgba(59,130,246,0.3)",
                      "0px 1px 3px rgba(0,0,0,0.05)",
                    ]
                  : "0px 1px 2px rgba(0,0,0,0.05)",
              zIndex: isDragging ? [10, 40, 40, 20] : 10,
            }
      }
      transition={
        isMorphing
          ? { type: "spring", stiffness: 150, damping: 20, mass: 1 }
          : {
              y: {
                delay: movementDelay,
                type: "spring",
                stiffness: 150,
                damping: 20,
                mass: 1.1,
              },
              opacity: {
                delay: opacityDelay,
                duration: 0.6,
                ease: "linear",
              },
              scale: {
                delay: movementDelay,
                duration: 1.8,
                ease: "easeInOut",
                times: [0, 0.2, 0.8, 1],
              },
              boxShadow: {
                delay: movementDelay,
                duration: 1.8,
                ease: "easeInOut",
                times: [0, 0.2, 0.8, 1],
              },
              zIndex: { delay: movementDelay, duration: 1.8 },
            }
      }
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        overflow: "hidden",
      }}
      className={`rounded-[14px] transition-colors duration-500 border ${
        isMe && entry?.user_id
          ? "bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-300"
          : "bg-white border-slate-100 shadow-sm"
      }`}
    >
      {/* Rigidly dimensioned ghost TopSpotlight fades out naturally without squeezing its text elements! */}
      {isMorphing && (
        <motion.div
          animate={{ opacity: [1, 1, 0] }}
          transition={{ duration: 1.0, times: [0, 0.4, 1], ease: "easeOut" }}
          className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center z-[60] pointer-events-none bg-gradient-to-br from-[#FFFAEB] via-[#FFF4CC] to-[#FFE57F] border-2 border-[#FFD700] rounded-[24px]"
          style={{ height: ghostBoxHeight, overflow: "hidden" }}
        >
          <div className="bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 p-3 rounded-full mb-1">
            <Crown
              size={26}
              className="text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]"
              fill="currentColor"
            />
          </div>
          <h3 className="text-[20px] font-black text-[#715403] tracking-tight truncate max-w-[90%]">
            {entry.username}
          </h3>
          <span className="text-[11px] font-extrabold text-yellow-700/80 uppercase tracking-[0.2em]">
            {entry.user_prof_level || "Learner"}
          </span>
        </motion.div>
      )}

      <motion.div
        initial={isMorphing ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.6 }}
        className="flex items-center justify-between p-2 h-full relative"
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2 relative z-20">
          {tickerValues &&
          tickerValues[0] !== tickerValues[1] &&
          tickerValues[0] <= 5 ? (
            <RankTicker oldRank={tickerValues[0]} newRank={tickerValues[1]} />
          ) : (
            renderRankBadge()
          )}

          <div className="min-w-0 flex flex-col pt-0.5">
            <span className="text-[13px] font-extrabold text-slate-800 truncate leading-tight">
              {entry.username}
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {entry.user_prof_level || "Learner"}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end whitespace-nowrap shrink-0 relative z-20">
          <div className="flex items-center gap-1.5 bg-orange-50/80 px-[7px] py-[3px] rounded-[10px] border border-orange-100/80">
            <Flame size={13} className="text-orange-500" fill="#f97316" />
            <span className="font-black text-orange-600 text-[13px]">
              {entry.current_streak || 1}
            </span>
          </div>
          <AnimatePresence>
            {isMe && (
              <span className="flex items-center gap-0.5 text-[8px] text-blue-600 font-black mt-0.5 uppercase tracking-widest bg-blue-100/50 px-1 rounded-sm">
                You
              </span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function StreakLeaderboardModal({
  open,
  onClose,
  loading,
  error,
  leaderboard = [],
  myRank,
  currentUserId,
}) {
  const shouldReduceMotion = useReducedMotion();
  
  const effectiveMyRank = myRank;

  const animState = useMemo(() => {
    let broken = false,
      fixedStreak = false,
      diff = 0,
      top5 = false,
      num1 = false,
      oldRnk = effectiveMyRank?.rank;

    if (effectiveMyRank) {
      try {
        const todayIST = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());
        const storedStr = localStorage.getItem("skillcase_leaderboard_history");
        let parsed = storedStr ? JSON.parse(storedStr) : null;
        if (parsed) {
          if (
            parsed.streak > 0 &&
            effectiveMyRank.current_streak === 0 &&
            parsed.date !== todayIST
          )
            broken = true;
          if (
            parsed.streak === 0 &&
            effectiveMyRank.current_streak >= 1 &&
            parsed.date !== todayIST
          )
            fixedStreak = true;
          if (
            parsed.rank &&
            parsed.rank !== effectiveMyRank.rank &&
            effectiveMyRank.rank > 0
          ) {
            oldRnk = parsed.rank;
            diff = parsed.rank - effectiveMyRank.rank;
            if (parsed.rank > 5 && effectiveMyRank.rank <= 5) top5 = true;
            if (parsed.rank > 1 && effectiveMyRank.rank === 1) num1 = true;
          }
        }
      } catch (e) {}
    }

    return {
      checked: true,
      brokenStreak: broken,
      fixedStreak,
      oldRank: oldRnk,
      diff,
      top5,
      num1,
    };
  }, [effectiveMyRank]);

  // Handle localstorage side-effect quietly outside the main rendering path
  useEffect(() => {
    if (effectiveMyRank) {
      try {
        const today = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());
        localStorage.setItem(
          "skillcase_leaderboard_history",
          JSON.stringify({
            date: today,
            rank: effectiveMyRank.rank,
            streak: effectiveMyRank.current_streak,
          }),
        );
      } catch (e) {}
    }
  }, [effectiveMyRank]);

  const ROW_HEIGHT = 56;
  const GAP = 8;
  const TOTAL_HEIGHT = ROW_HEIGHT + GAP;

  const baseSource = leaderboard;
  const topEntry = baseSource ? baseSource[0] || null : null;

  const maxFetchedRank = baseSource && baseSource.length > 0 ? Math.max(...baseSource.map((r) => r.rank)) : 0;

  // Always bind dynamic sliding offset window to destination frame perfectly
  const isRankingDown = animState.diff < 0 && !animState.brokenStreak;
  let renderWindowStart = 2;
  
  if (effectiveMyRank && effectiveMyRank.rank > 5) {
    if (isRankingDown) {
      renderWindowStart = Math.max(6, effectiveMyRank.rank - 3);
    } else {
      renderWindowStart = effectiveMyRank.rank;
    }
    
    // Intelligently slide the camera bounds natively so we don't randomly display "Waiting for Challenger" blocks bleeding into empty rank positions when reaching the end of the database!
    if (maxFetchedRank > 5 && renderWindowStart + 3 > maxFetchedRank) {
      renderWindowStart = Math.max(6, maxFetchedRank - 3);
    }
  }

  const slots = Array.from({ length: 4 }).map((_, i) => {
    const rankNum = Number(renderWindowStart) + i;
    const entry = baseSource
      ? baseSource.find((r) => r.rank === rankNum) || null
      : null;
    let initialRank = rankNum;

    if (animState.diff !== 0 && !animState.brokenStreak) {
      if (entry && entry?.user_id === effectiveMyRank?.user_id) {
        initialRank = animState.oldRank;
      } else if (entry) {
        if (
          animState.diff > 0 &&
          rankNum > effectiveMyRank?.rank &&
          rankNum <= animState.oldRank
        ) {
          initialRank = rankNum - 1;
        } else if (
          animState.diff < 0 &&
          rankNum < effectiveMyRank?.rank &&
          rankNum >= animState.oldRank
        ) {
          initialRank = rankNum + 1;
        }
      }
    }

    const safeInitialRank =
      initialRank > 5 || initialRank === 0 || initialRank === Infinity
        ? 6
        : initialRank;
    const targetY = (rankNum - renderWindowStart) * TOTAL_HEIGHT;

    // Evaluate explicit initial jump relative physically to new window frame!
    const isNewNPC =
      !animState.num1 &&
      entry &&
      entry.user_id !== effectiveMyRank?.user_id &&
      initialRank === rankNum &&
      animState.diff !== 0;

    let initialY;
    if (entry?.user_id === effectiveMyRank?.user_id && animState.oldRank) {
      initialY = (animState.oldRank - renderWindowStart) * TOTAL_HEIGHT;
    } else if (isNewNPC && Math.abs(animState?.diff || 0) > 3 && !animState.brokenStreak) {
      initialY = targetY; // Lock strictly loaded for massive bounding jumps
    } else if (isNewNPC) {
      initialY = targetY - 20; // New NPCs softly fly down for short local updates
    } else {
      initialY = (safeInitialRank - renderWindowStart) * TOTAL_HEIGHT;
    }

    return {
      displayRank: rankNum,
      entry,
      targetY,
      initialY,
      initialRank: safeInitialRank,
    };
  });

  const myRankLabel =
    effectiveMyRank?.rank === 0 ? "Unranked" : `#${effectiveMyRank?.rank}`;
  const myStreak = effectiveMyRank?.current_streak ?? 0;
  const isPulsingRankUp =
    animState.diff > 0 &&
    animState.oldRank > 5 &&
    effectiveMyRank?.rank > 5 &&
    !animState.brokenStreak;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1800] flex items-center justify-center p-3 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Close leaderboard"
            className="absolute inset-0 bg-[#001433]/40 backdrop-blur-[4px]"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={
              shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 0, scale: 0.95, y: 15 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.95, y: 10 }
            }
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-[380px] max-h-[95vh] overflow-y-auto no-scrollbar rounded-[26px] bg-[#f8fafc] shadow-2xl border border-white"
          >
            <div className="absolute top-0 left-0 w-full h-[140px] bg-gradient-to-b from-blue-100/50 to-transparent pointer-events-none" />

            <div className="relative z-10">
              <div className="sticky top-0 z-50 flex items-center justify-between px-4 pt-4 pb-1.5 bg-[#f8fafc]/95 backdrop-blur-md border-b flex-shrink-0 border-slate-100">
                <div>
                  <h2 className="text-[20px] font-black tracking-tight text-slate-800 flex items-center gap-1.5">
                    Daily Top 5
                    <Flame
                      className="text-orange-500"
                      fill="#f97316"
                      size={20}
                    />
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Streak Champions
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200/80 text-slate-500 transition-all hover:bg-slate-300 hover:text-slate-800 hover:rotate-90 active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* DOM Unmount bug eliminated by keeping static tree structure */}
              <div className="px-4 pb-4 pt-1">
                {loading || !animState.checked ? (
                  <LoadingState />
                ) : error ? (
                  <motion.div
                    initial={
                      shouldReduceMotion
                        ? { opacity: 1 }
                        : { opacity: 0, y: 20 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[22px] border-2 border-dashed border-slate-200 bg-slate-50/50 p-5 text-center mt-2"
                  >
                    <div className="bg-slate-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2.5 ring-4 ring-white">
                      <Trophy className="h-7 w-7 text-slate-300" />
                    </div>
                    <p className="text-[15px] font-extrabold text-slate-700">
                      Leaderboard is empty
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-slate-500 px-3 leading-relaxed">
                      {error}
                    </p>
                  </motion.div>
                ) : (
                  <div className="pt-0.5">
                    <TopSpotlight
                      key={`spot-${
                        currentUserId && topEntry?.user_id === currentUserId
                          ? "hero"
                          : "npc"
                      }`}
                      entry={topEntry}
                      isMe={
                        currentUserId && topEntry?.user_id === currentUserId
                      }
                      shouldReduceMotion={shouldReduceMotion}
                      isNewChampion={animState.num1}
                      animState={animState}
                    />

                    {/* Visual Context Divider for Jumping Bounding Viewports > 5 */}
                    {renderWindowStart > 2 && (
                      <div className="flex justify-center -mt-1.5 mb-1.5 relative z-30 opacity-70">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mx-1 shadow-inner shrink-0" />
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 shadow-inner mx-1 shrink-0" />
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 shadow-inner mx-1 shrink-0" />
                      </div>
                    )}

                    <div
                      className="relative"
                      style={{ height: slots.length * TOTAL_HEIGHT - GAP }}
                    >
                      {slots.map((slot) => (
                        <RankRow
                          key={`slot-${
                            slot.entry?.user_id || slot.displayRank
                          }-user${
                            currentUserId &&
                            slot?.entry?.user_id === currentUserId
                              ? effectiveMyRank?.rank
                              : ""
                          }`}
                          displayRank={slot.displayRank}
                          entry={slot.entry}
                          isMe={
                            currentUserId &&
                            slot?.entry?.user_id === currentUserId
                          }
                          shouldReduceMotion={shouldReduceMotion}
                          isNewEntrance={animState.top5}
                          initialY={slot.initialY}
                          targetY={slot.targetY}
                          tickerValues={[slot.initialRank, slot.displayRank]}
                          animState={animState}
                          renderWindowStart={renderWindowStart}
                        />
                      ))}
                    </div>

                    {animState.brokenStreak ? (
                      <motion.div
                        initial={false}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3.5 rounded-[20px] bg-slate-900 border border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden relative z-30"
                      >
                        <div className="absolute inset-0 bg-red-900/20 mix-blend-overlay"></div>
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-600/20 rounded-full blur-[20px] mix-blend-screen pointer-events-none"></div>

                        <div className="px-5 py-4 relative z-10 flex items-center justify-between">
                          <div className="flex items-center gap-3.5">
                            <motion.div
                              animate={{
                                rotate: [-5, 5, -5],
                                scale: [1, 1.1, 1],
                              }}
                              transition={{
                                repeat: Infinity,
                                duration: 2,
                                ease: "easeInOut",
                              }}
                              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] bg-slate-800/80 border border-slate-700 shadow-inner"
                            >
                              <HeartCrack className="h-6 w-6 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                            </motion.div>
                            <div>
                              <p
                                className="text-[14px] font-black tracking-widest text-slate-200 uppercase mb-0.5"
                                style={{
                                  textShadow: "0 2px 10px rgba(255,0,0,0.4)",
                                }}
                              >
                                Streak Lost
                              </p>
                              <p className="text-[10px] font-bold text-slate-400">
                                The grind starts again!
                              </p>
                            </div>
                          </div>

                          <motion.button
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5, type: "spring" }}
                            className="flex flex-col items-center bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 px-3 rounded-[10px] border border-slate-600 transition-colors"
                          >
                            <RotateCcw
                              size={14}
                              className="mb-0.5 text-blue-400"
                            />
                            <span className="text-[8px] font-black uppercase tracking-widest">
                              Restart
                            </span>
                          </motion.button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={effectiveMyRank.rank}
                        initial={false}
                        animate={{
                          scale: isPulsingRankUp ? [1, 1.05, 1.04, 1] : 1,
                          boxShadow: isPulsingRankUp
                            ? [
                                "0px 0px 0px rgba(0,0,0,0)",
                                "0px 10px 25px rgba(59,130,246,0.3)",
                                "0px 10px 25px rgba(59,130,246,0.3)",
                                "0px 4px 6px rgba(0,0,0,0.05)",
                              ]
                            : "0px 4px 6px rgba(0,0,0,0.05)",
                        }}
                        transition={{
                          duration: 2.2,
                          times: [0, 0.2, 0.8, 1],
                          ease: "easeInOut",
                        }}
                        className={`mt-4 overflow-hidden relative rounded-[16px] py-3.5 px-4 z-30 transition-colors shadow-sm ${
                          animState.diff > 0
                            ? "bg-blue-50 border-2 border-blue-300 ring-2 ring-blue-100"
                            : "bg-white border-2 border-slate-100"
                        }`}
                      >
                        {animState.diff > 0 && (
                          <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: "240%" }}
                            transition={{
                              duration: 1.5,
                              ease: "easeInOut",
                              delay: 1,
                            }}
                            className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent skew-x-12"
                          />
                        )}

                        {/* NORMAL LOWER-FOOTER PAYLOAD */}
                        <div className="flex items-center justify-between px-0.5 relative z-10">
                          <div className="flex items-center gap-3">
                            <div className="flex relative h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-slate-50 shadow-inner border border-slate-200">
                              {animState.diff > 0 && (
                                <TrendingUp className="absolute -top-1.5 -right-1.5 h-4 w-4 text-green-500 animate-pulse drop-shadow-sm" />
                              )}
                              <Award className="h-5 w-5 text-indigo-500" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">
                                  Your Rank
                                </p>
                                {animState.diff > 0 && (
                                  <motion.span
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1 }}
                                    className="text-[9px] font-black text-green-600 bg-green-100 px-1.5 rounded-sm leading-none py-0.5 border border-green-200 shadow-sm"
                                  >
                                    +{animState.diff}
                                  </motion.span>
                                )}
                              </div>
                              <p className="text-[17px] font-black tracking-tight text-slate-800 leading-none">
                                {animState.diff > 0 && animState.oldRank ? (
                                  <AnimatedCounter
                                    from={animState.oldRank}
                                    to={effectiveMyRank?.rank}
                                    delay={1}
                                  />
                                ) : (
                                  myRankLabel
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                              Your Streak
                            </p>
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-[18px] font-black text-slate-800 leading-none">
                                {myStreak}
                              </span>
                              <Flame
                                className="h-[20px] w-[20px] text-orange-500"
                                fill="#f97316"
                              />
                            </div>
                          </div>
                        </div>

                        {/* EXCLUSIVE 'STREAK RESTORED' CINEMATIC IMPLANT */}
                        {animState.fixedStreak && <StreakRestoredOverlay />}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
