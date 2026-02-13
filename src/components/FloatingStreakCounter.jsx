import React, { useState, useEffect, useRef, useMemo } from "react";

const FloatingStreakCounter = ({ current, target, onComplete }) => {
  const [isPop, setIsPop] = useState(false);
  const [showFire, setShowFire] = useState(false);
  const [showPlusN, setShowPlusN] = useState(false);
  const [lastDiff, setLastDiff] = useState(1);

  const prevCurrentRef = useRef(current);
  const isFirstRender = useRef(true);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const progress = target ? Math.min(current / target, 1) : 0;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // Ring color shifts: teal → blue → indigo → gold on completion
  const ringColor = useMemo(() => {
    if (progress >= 1) return "#f59e0b";
    if (progress >= 0.7) return "#6366f1";
    if (progress >= 0.4) return "#3b82f6";
    return "#14b8a6";
  }, [progress]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevCurrentRef.current = current;
      return;
    }

    const diff = current - prevCurrentRef.current;
    prevCurrentRef.current = current;

    if (diff > 0) {
      setIsPop(true);
      setLastDiff(diff);
      setShowPlusN(true);
      const popTimer = setTimeout(() => setIsPop(false), 300);
      const plusTimer = setTimeout(() => setShowPlusN(false), 1200);

      let fireTimer = null;
      let completeTimer = null;

      if (current >= target) {
        fireTimer = setTimeout(() => {
          setShowFire(true);
          completeTimer = setTimeout(() => {
            if (onCompleteRef.current) onCompleteRef.current();
          }, 2000);
        }, 500);
      }

      return () => {
        clearTimeout(popTimer);
        clearTimeout(plusTimer);
        if (fireTimer) clearTimeout(fireTimer);
        if (completeTimer) clearTimeout(completeTimer);
      };
    }
  }, [current, target]);

  if (!target) return null;

  return (
    <div className="fixed bottom-14 right-3 z-50 flex flex-col items-center pointer-events-none select-none">
      <style>
        {`
          @keyframes microFloat {
            0% { transform: translateY(0) scale(0.5); opacity: 0; }
            25% { transform: translateY(-12px) scale(1); opacity: 1; }
            100% { transform: translateY(-22px) scale(0.8); opacity: 0; }
          }
          @keyframes gentleGlow {
            0%, 100% { filter: drop-shadow(0 0 4px rgba(245,158,11,0.3)); }
            50% { filter: drop-shadow(0 0 10px rgba(245,158,11,0.6)); }
          }
          .animate-micro-float { animation: microFloat 0.6s ease-out forwards; }
          .animate-gentle-glow { animation: gentleGlow 1.2s ease-in-out infinite; }
        `}
      </style>

      <div
        className={`
          relative w-10 h-10 transition-transform duration-300
          ${isPop ? "scale-110" : "scale-100"}
          ${showFire ? "animate-gentle-glow" : ""}
        `}
      >
        {/* Frosted Glass Background */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "rgba(255, 255, 255, 0.75)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: showFire
              ? "0 2px 12px rgba(245,158,11,0.25), inset 0 1px 2px rgba(255,255,255,0.6)"
              : "0 1px 8px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,0.6)",
            transition: "box-shadow 0.5s ease",
          }}
        />

        {/* Progress Ring */}
        <svg className="absolute inset-0 w-10 h-10 -rotate-90" viewBox="0 0 40 40">
          {/* Track */}
          <circle
            cx="20" cy="20" r={radius}
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="2.5"
          />
          {/* Progress */}
          <circle
            cx="20" cy="20" r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.5s ease-out, stroke 0.5s ease" }}
          />
        </svg>

        {/* Center Number */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span
            className="font-black leading-none"
            style={{
              fontSize: 13,
              color: showFire ? "#f59e0b" : "#374151",
              transition: "color 0.4s ease",
            }}
          >
            {Math.min(current, target)}
          </span>
        </div>

        {/* Completion glow ring */}
        {showFire && (
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              border: "2px solid rgba(245,158,11,0.3)",
            }}
          />
        )}
      </div>

      {/* Floating +N */}
      {showPlusN && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 animate-micro-float">
          <span
            className="font-bold text-xs"
            style={{ color: ringColor }}
          >
            +{lastDiff}
          </span>
        </div>
      )}
    </div>
  );
};

export default FloatingStreakCounter;