import { motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { POSITION_INNER, POSITION_MOTION } from "./promoAdConfig";

const hasCta = (ad) =>
  ad.cta_type && ad.cta_type !== "none" && ad.cta_label && ad.cta_target;

// Small hex → rgba helper for tinted chips/buttons.
const alpha = (hex, a) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!m) return `rgba(0, 40, 86, ${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const CloseBtn = ({ onDismiss }) => (
  <button
    type="button"
    aria-label="Close ad"
    onClick={onDismiss}
    className="shrink-0 w-6 h-6 rounded-full bg-slate-900/8 text-slate-500 flex items-center justify-center cursor-pointer hover:bg-slate-900/15 transition-colors"
  >
    <X className="w-3.5 h-3.5" />
  </button>
);

const CtaButton = ({ ad, onCta, className = "" }) =>
  hasCta(ad) ? (
    <button
      type="button"
      onClick={onCta}
      className={`group inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-white cursor-pointer transition-opacity hover:opacity-90 ${className}`}
      style={{ backgroundColor: ad.color }}
    >
      <span className="max-w-44 truncate">{ad.cta_label}</span>
      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
    </button>
  ) : null;

// Staggered fade-up for card content — exits mirror it in reverse order.
const rise = (i) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.14, delay: (2 - i) * 0.04 },
  },
  transition: { delay: 0.1 + i * 0.07, type: "spring", stiffness: 320, damping: 26 },
});

// Aspect classes for the card image frame — object-cover fills it cleanly.
const RATIO_CLS = {
  "16:9": "aspect-video",
  "1:1": "aspect-square",
  "9:16": "aspect-[9/16]",
};

const CardAd = ({ ad, onDismiss, onCta }) => (
  <div className="relative w-full max-w-[320px] max-h-full flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-[0_12px_40px_-8px_rgba(2,6,23,0.25)] overflow-hidden">
    <div className="absolute top-2 right-2 z-10">
      <CloseBtn onDismiss={onDismiss} />
    </div>
    {ad.image_download_url && (
      <div
        className={`w-full ${RATIO_CLS[ad.image_ratio] || "aspect-video"} shrink min-h-[72px] bg-slate-100 overflow-hidden`}
      >
        <motion.img
          src={ad.image_download_url}
          alt=""
          initial={{ scale: 1.07, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{
            scale: 1.07,
            opacity: 0,
            transition: { duration: 0.16, ease: "easeIn" },
          }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full h-full object-cover"
        />
      </div>
    )}
    <div className="px-4 pt-3 pb-4 flex flex-col gap-1.5 shrink-0">
      <motion.p
        {...rise(0)}
        className="text-sm font-extrabold text-slate-900 pr-5 leading-snug line-clamp-2"
      >
        {ad.title}
      </motion.p>
      {ad.body && (
        <motion.p
          {...rise(1)}
          className="text-xs font-medium text-slate-500 leading-relaxed line-clamp-3"
        >
          {ad.body}
        </motion.p>
      )}
      {hasCta(ad) && (
        <motion.div {...rise(2)}>
          <CtaButton ad={ad} onCta={onCta} className="mt-1.5 h-8 px-3 self-start" />
        </motion.div>
      )}
    </div>
  </div>
);

const BannerAd = ({ ad, onDismiss, onCta }) => (
  <div className="relative w-full max-w-[340px] bg-white rounded-2xl border border-slate-200/80 shadow-[0_12px_40px_-8px_rgba(2,6,23,0.25)] pl-2 pr-3 py-2.5 flex items-center gap-3 overflow-hidden">
    <motion.span
      exit={{
        scaleY: 0,
        transition: { duration: 0.18, ease: "easeIn" },
      }}
      className="absolute left-0 top-0 bottom-0 w-1 origin-top"
      style={{ backgroundColor: ad.color }}
    />
    {ad.image_download_url && (
      <motion.img
        src={ad.image_download_url}
        alt=""
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.14 } }}
        transition={{ delay: 0.08, type: "spring", stiffness: 400, damping: 20 }}
        className="w-11 h-11 rounded-xl object-cover shrink-0"
      />
    )}
    <motion.div
      exit={{ opacity: 0, x: -8, transition: { duration: 0.14 } }}
      className="flex-1 min-w-0"
    >
      <p className="text-xs font-extrabold text-slate-900 truncate">
        {ad.title}
      </p>
      {ad.body && (
        <p className="text-[10px] font-medium text-slate-500 truncate">
          {ad.body}
        </p>
      )}
    </motion.div>
    <CtaButton ad={ad} onCta={onCta} className="h-7 px-2.5 shrink-0" />
    <CloseBtn onDismiss={onDismiss} />
  </div>
);

const ChipAd = ({ ad, onDismiss, onCta }) => (
  <motion.div
    initial={{ scale: 0.55, rotate: -3 }}
    animate={{ scale: 1, rotate: 0 }}
    exit={{
      scale: 0.55,
      rotate: 3,
      opacity: 0,
      transition: { duration: 0.18, ease: "easeIn" },
    }}
    transition={{ type: "spring", stiffness: 420, damping: 17 }}
    className="relative max-w-full bg-white rounded-2xl border shadow-[0_10px_30px_-6px_rgba(2,6,23,0.22)] pl-3.5 pr-2 py-2 flex items-center gap-2.5"
    style={{ borderColor: alpha(ad.color, 0.35) }}
  >
    <span className="relative flex w-2 h-2 shrink-0">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
        style={{ backgroundColor: ad.color }}
      />
      <span
        className="relative inline-flex rounded-full w-2 h-2"
        style={{ backgroundColor: ad.color }}
      />
    </span>
    <motion.p
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6, transition: { duration: 0.12 } }}
      transition={{ delay: 0.12, duration: 0.25 }}
      className="text-xs font-extrabold text-slate-900 leading-snug line-clamp-2"
    >
      {ad.title}
    </motion.p>
    {hasCta(ad) && (
      <motion.button
        type="button"
        onClick={onCta}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{
          opacity: 0,
          scale: 0.7,
          transition: { duration: 0.12 },
        }}
        transition={{ delay: 0.22, type: "spring", stiffness: 400, damping: 22 }}
        className="text-[11px] font-extrabold whitespace-nowrap cursor-pointer hover:opacity-80 inline-flex items-center gap-0.5"
        style={{ color: ad.color }}
      >
        {ad.cta_label}
        <ArrowRight className="w-3 h-3" />
      </motion.button>
    )}
    <CloseBtn onDismiss={onDismiss} />
  </motion.div>
);

const TEMPLATES = { card: CardAd, banner: BannerAd, chip: ChipAd };

// The card body without positioning — admin preview uses this directly.
export function PromoAdCard({ ad, onDismiss = () => {}, onCta = () => {} }) {
  const Template = TEMPLATES[ad?.template] || CardAd;
  return <Template ad={ad} onDismiss={onDismiss} onCta={onCta} />;
}

// Live overlay: non-blocking fixed anchor; card slides in/out toward its side.
export function PositionedPromoAd({ ad, onDismiss, onCta }) {
  const offset = POSITION_MOTION[ad.position] || POSITION_MOTION.bottom_right;
  const align = POSITION_INNER[ad.position] || POSITION_INNER.bottom_right;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[9000] pointer-events-none p-3 sm:p-4 pt-20 pb-24"
    >
      <motion.div
        initial={{ opacity: 0.6, scale: 0.92, ...offset }}
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        exit={{
          opacity: 0,
          scale: 0.9,
          ...offset,
          transition: { duration: 0.22, ease: [0.5, 0, 1, 0.4] },
        }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className={`pointer-events-auto w-full h-full flex flex-col min-h-0 ${align}`}
      >
        <PromoAdCard ad={ad} onDismiss={onDismiss} onCta={onCta} />
      </motion.div>
    </motion.div>
  );
}
