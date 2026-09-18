import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Loader2 } from "lucide-react";
import { OpportunityHeader, OpportunityBlocks } from "./OpportunityBlocks";
import { oppAlpha } from "./opportunityTheme";

// The candidate opportunity detail page body — shared between the real
// select_opportunity step and the admin 414×896 live preview so the preview
// is pixel-accurate. `preview` mode disables the actions (no writes).
// `status` is the candidate's pick state for this path:
//   null        → untouched, "Choose this path"
//   chosen      → picked, awaiting admin decision — locked "Already Chosen"
//   shortlisted → green "You're Shortlisted" → opens the congratulations screen
//   rejected    → disabled rose "Rejected"
const CTA_BY_STATUS = {
  rejected: {
    label: "Rejected",
    disabled: true,
    className:
      "bg-rose-100 text-rose-600 border border-rose-200 cursor-not-allowed",
  },
  shortlisted: {
    label: "You're Shortlisted",
    className:
      "bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer border-none",
  },
  chosen: {
    label: "Already Chosen",
    disabled: true,
    className:
      "bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed",
  },
};

const OpportunityDetailView = ({
  opportunity,
  status = null,
  choosing = false,
  error = "",
  onChoose,
  onShortlisted,
  onBack,
  preview = false,
  scrollToCta = false,
}) => {
  const ctaRef = useRef(null);
  const [ctaVisible, setCtaVisible] = useState(null);

  useEffect(() => {
    if (!scrollToCta || preview) return;
    const t = setTimeout(
      () => ctaRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
      250,
    );
    return () => clearTimeout(t);
  }, [scrollToCta, preview]);

  // Track whether the CTA is on-screen so the scroll nudge only exists while
  // the button is below the fold. null = not yet observed (renders nothing,
  // so short pages never flash it).
  useEffect(() => {
    if (preview) return undefined;
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const obs = new IntersectionObserver(
      ([entry]) => setCtaVisible(entry.isIntersecting),
      { threshold: 0.01 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [preview]);

  const cta = CTA_BY_STATUS[status];
  const ctaLabel = cta
    ? cta.label
    : choosing
      ? "Selecting…"
      : "Choose this path";
  const ctaClass = cta
    ? cta.className
    : "bg-[#002856] hover:bg-[#07192f] disabled:opacity-60 text-white cursor-pointer border-none";
  const ctaDisabled = preview || (cta ? cta.disabled : choosing);
  const ctaClick = status === "shortlisted" ? onShortlisted : onChoose;

  return (
    <div
      className={`flex-1 ${preview ? "px-4" : "px-4 sm:px-6"} pt-6 pb-8 flex flex-col gap-5 min-h-full`}
      style={{
        background: `linear-gradient(180deg, ${oppAlpha(opportunity?.color, 0.14)} 0%, #ffffff 100%)`,
      }}
    >
      <OpportunityHeader opportunity={opportunity} />
      <OpportunityBlocks
        blocks={opportunity?.blocks}
        color={opportunity?.color}
      />
      {error && !preview && (
        <p className="text-[11px] font-semibold text-rose-600">{error}</p>
      )}
      <div ref={ctaRef} className="mt-auto pt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={ctaClick}
          disabled={ctaDisabled}
          className={`w-full h-12 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${ctaClass}`}
        >
          {choosing && !cta && <Loader2 className="w-4 h-4 animate-spin" />}
          {ctaLabel}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={preview}
          className="w-full h-12 bg-white text-[#002856] rounded-xl font-bold text-sm border border-slate-300 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center"
        >
          Go back to other options
        </button>
      </div>
      {/* Tiny bottom-right scroll cue — portaled to body so it anchors to the
          real viewport (nested overflow/transform ancestors would otherwise
          capture it). Exists only while the CTA is off-screen. Purely a
          visual hint: non-interactive, tinted to the path's status. */}
      {!preview &&
        ctaVisible === false &&
        createPortal(
          <div
            aria-hidden="true"
            className={`fixed z-40 w-6 h-6 rounded-full text-white shadow-md shadow-slate-900/20 flex items-center justify-center pointer-events-none ${
              status === "shortlisted"
                ? "bg-emerald-500"
                : status === "rejected"
                  ? "bg-rose-500"
                  : "bg-[#002856]"
            }`}
            style={{
              right: "1rem",
              bottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </div>,
          document.body,
        )}
    </div>
  );
};

export default OpportunityDetailView;
