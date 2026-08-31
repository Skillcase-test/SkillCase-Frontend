import React from "react";
import { ChevronLeft, X } from "lucide-react";

/**
 * Reusable Scholarship Status Card component.
 * Encapsulates the centered circular character halo, frosted floating icon,
 * status pill badge, typography, action buttons, and back navigation.
 */
export default function ScholarshipStatusCard({
  topTitle = "Scholarship Exam",
  badge, // { icon: Component, label: string, color: "red" | "blue" | "gold" | "green" }
  character, // image asset (e.g. mayaSad, mayaSmiling, mayaThumbsup)
  characterAlt = "Maya",
  floatingIcon: FloatingIcon, // icon component to render in the frosted glass badge
  floatingBadgeType, // "rejection" | "icon" | null
  title, // string | ReactNode
  description, // string | ReactNode
  extraContent, // optional ReactNode between description and CTAs (e.g. countdown timer, percent award)
  primaryCta, // { label, icon: Component, onClick, href }
  secondaryCta, // { label, icon: Component, onClick, href }
  onBack, // callback for back navigation
  backLabel = "Back to Scholarship",
}) {
  const badgeStyles = {
    red: "bg-[#ffe4e6] text-[#e11d48] border-[#fecdd3]",
    blue: "bg-[#e0f2fe] text-[#0284c7] border-[#bae6fd]",
    gold: "bg-[#fef3c7] text-[#b45309] border-[#fde68a]",
    green: "bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const badgeClass = badgeStyles[badge?.color] || badgeStyles.slate;
  const BadgeIcon = badge?.icon;
  const PrimaryIcon = primaryCta?.icon;
  const SecondaryIcon = secondaryCta?.icon;

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-start relative">
      {/* Sub-Header bar */}
      <div className="w-full flex items-center justify-between mb-3 px-1">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-base font-bold text-[#002856] hover:opacity-80 transition cursor-pointer bg-transparent border-none p-0"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            <span>Back</span>
          </button>
        ) : (
          <div />
        )}
        <span className="text-sm font-semibold text-[#64748b]">{topTitle}</span>
      </div>

      {/* Main Card Container with soft sky-blue gradient taking full available height */}
      <div className="w-full flex-1 px-5 py-7 bg-gradient-to-b from-[#eaf2fd] via-[#f0f6ff] to-[#f8fbff] rounded-md border border-blue-100/60 flex flex-col justify-between items-center text-center">
        {/* Top/Center content group */}
        <div className="w-full flex flex-col items-center justify-center my-auto">
          {/* Character Hero in circular soft glow with floating clouds */}
          <div className="relative my-3 flex items-center justify-center w-full max-w-[280px]">
            {/* Horizontal soft background capsule */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 sm:w-72 h-28 sm:h-32 bg-[#dbeafe]/50 rounded-full blur-[2px] pointer-events-none" />

            {/* Left Cloud */}
            <div className="absolute top-5 -left-3 sm:-left-6 z-0 opacity-90 pointer-events-none drop-shadow-sm">
              <svg width="68" height="42" viewBox="0 0 80 50" fill="none">
                <path
                  d="M24 42h34a10 10 0 0 0 9.8-8 10 10 0 0 0-7.8-11.8 16 16 0 0 0-30 0 12 12 0 0 0-7.8 11.8 12 12 0 0 0 11.8 8z"
                  fill="url(#cloudGradLeft)"
                />
                <defs>
                  <linearGradient
                    id="cloudGradLeft"
                    x1="40"
                    y1="6"
                    x2="40"
                    y2="42"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#ffffff" />
                    <stop offset="1" stopColor="#f0f6ff" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Right Cloud */}
            <div className="absolute top-7 -right-3 sm:-right-6 z-0 opacity-95 pointer-events-none drop-shadow-sm">
              <svg width="72" height="44" viewBox="0 0 80 50" fill="none">
                <path
                  d="M26 42h30a11 11 0 0 0 10.5-8 11 11 0 0 0-8.5-13 17 17 0 0 0-32 0 13 13 0 0 0-8.5 13 13 13 0 0 0 12.5 8z"
                  fill="url(#cloudGradRight)"
                />
                <defs>
                  <linearGradient
                    id="cloudGradRight"
                    x1="40"
                    y1="4"
                    x2="40"
                    y2="42"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#ffffff" />
                    <stop offset="1" stopColor="#edf5fe" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Subtle decorative particles */}
            <div className="absolute top-12 left-6 w-2 h-2.5 rounded-full bg-blue-300/40 blur-[0.5px]" />
            <div className="absolute bottom-8 left-2 w-3.5 h-3.5 rounded-full border-2 border-blue-200/50" />
            <div className="absolute top-14 right-8 w-2 h-2 rounded-full bg-blue-300/30 blur-[0.5px]" />

            {/* Center Circular Disc */}
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-b from-[#d8e9fe] to-[#edf5fe] flex items-end justify-center shadow-[inset_0_2px_6px_rgba(255,255,255,0.9),_0_6px_20px_rgba(186,215,254,0.35)]">
              {character && (
                <img
                  src={character}
                  alt={characterAlt}
                  className="relative z-10 w-38 object-contain drop-shadow-[0_8px_14px_rgba(0,40,86,0.12)]"
                />
              )}
            </div>

            {/* Frosted Glass Floating Badge / Rejection Card */}
            {floatingBadgeType === "rejection" ? (
              <div className="absolute right-5 bottom-2 sm:bottom-3 z-20 w-13 h-15 sm:w-14 sm:h-16 rounded-2xl bg-white/80 backdrop-blur-md border-2 border-white shadow-[0_8px_20px_rgba(148,163,184,0.3)] flex flex-col items-center justify-center p-2">
                <div className="w-4 h-1.5 bg-[#93c5fd]/80 rounded-full mb-1" />
                <div className="w-6 h-0.5 bg-[#93c5fd]/60 rounded-full mb-1" />
                <div className="w-6 h-0.5 bg-[#93c5fd]/40 rounded-full mb-1" />
                <div className="w-4 h-0.5 bg-[#93c5fd]/30 rounded-full" />
                {/* Red X Badge on corner */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#ef4444] border-2 border-white flex items-center justify-center text-white shadow-sm">
                  <X className="w-3 h-3 stroke-[3]" />
                </div>
              </div>
            ) : FloatingIcon ? (
              <div className="absolute right-5 bottom-2 sm:bottom-3 z-20 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/45 backdrop-blur-xl border-2 border-white shadow-[0_8px_24px_rgba(148,163,184,0.28),_inset_0_1px_2px_rgba(255,255,255,0.95)] flex items-center justify-center">
                <FloatingIcon className="w-7 h-7 sm:w-8 sm:h-8 text-[#93c5fd] stroke-[2.2] stroke-linecap-round stroke-linejoin-round drop-shadow-[0_1px_2px_rgba(147,197,253,0.5)]" />
              </div>
            ) : null}
          </div>

          {/* Status Pill Badge */}
          {badge && (
            <div className="flex justify-center mt-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${badgeClass}`}
              >
                {BadgeIcon && (
                  <BadgeIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                <span>{badge.label}</span>
              </span>
            </div>
          )}

          {/* Title */}
          {title && (
            <h1 className="text-[26px] sm:text-[30px] font-extrabold text-[#002856] text-center mt-3 tracking-tight leading-tight">
              {title}
            </h1>
          )}

          {/* Description */}
          {description && (
            <div className="text-slate-600 text-xs sm:text-sm mt-2 px-3 text-center leading-relaxed max-w-xs mx-auto">
              {description}
            </div>
          )}

          {/* Extra optional content (award amount, countdown, etc.) */}
          {extraContent && <div className="w-full mt-3">{extraContent}</div>}
        </div>

        {/* Action Buttons Stack */}
        <div className="w-full mt-6 space-y-3 max-w-sm mx-auto">
          {primaryCta &&
            (primaryCta.href ? (
              <a
                href={primaryCta.href}
                onClick={primaryCta.onClick}
                className="w-full py-3.5 px-5 bg-[#002856] hover:bg-[#001e40] text-white rounded-md font-bold text-sm sm:text-base transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
              >
                {PrimaryIcon && (
                  <PrimaryIcon className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                )}
                <span>{primaryCta.label}</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={primaryCta.onClick}
                className="w-full py-3.5 px-5 bg-[#002856] hover:bg-[#001e40] text-white rounded-md font-bold text-sm sm:text-base transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
              >
                {PrimaryIcon && (
                  <PrimaryIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                <span>{primaryCta.label}</span>
              </button>
            ))}

          {secondaryCta && (
            <button
              type="button"
              onClick={secondaryCta.onClick}
              className="w-full py-3.5 px-5 bg-white hover:bg-slate-50 border border-slate-200/80 text-[#002856] rounded-md font-bold text-sm sm:text-base transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
            >
              {SecondaryIcon && (
                <SecondaryIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#eab308]" />
              )}
              <span>{secondaryCta.label}</span>
            </button>
          )}

          {/* Divider & Back Link */}
          {onBack && (
            <>
              <div className="flex items-center gap-3 w-full pt-1">
                <div className="flex-1 border-t border-slate-300/70" />
                <span className="text-xs text-slate-400 font-medium">or</span>
                <div className="flex-1 border-t border-slate-300/70" />
              </div>

              <div className="text-center pt-0.5">
                <button
                  type="button"
                  onClick={onBack}
                  className="text-sm font-bold text-[#002856] hover:underline cursor-pointer bg-transparent border-none p-0"
                >
                  {backLabel}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
