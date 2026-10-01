import { motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { POSITION_ALIGN, POSITION_MOTION } from "./promoAdConfig";

const hasCta = (ad) =>
  ad.cta_type && ad.cta_type !== "none" && ad.cta_label && ad.cta_target;

// Small hex → rgba helper for tinted chips/buttons.
const alpha = (hex, a) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!m) return `rgba(8, 50, 98, ${a})`;
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
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold text-white cursor-pointer transition-opacity hover:opacity-90 ${className}`}
      style={{ backgroundColor: ad.color }}
    >
      {ad.cta_label}
      <ArrowRight className="w-3.5 h-3.5" />
    </button>
  ) : null;

const CardAd = ({ ad, onDismiss, onCta }) => (
  <div className="relative w-[min(320px,calc(100vw-24px))] bg-white rounded-2xl border border-slate-200/80 shadow-[0_12px_40px_-8px_rgba(2,6,23,0.25)] overflow-hidden">
    <div className="absolute top-2 right-2 z-10">
      <CloseBtn onDismiss={onDismiss} />
    </div>
    {ad.image_download_url && (
      <img
        src={ad.image_download_url}
        alt=""
        className="w-full h-28 object-cover"
      />
    )}
    <div className="px-4 pt-3 pb-4 flex flex-col gap-1.5">
      <p className="text-sm font-extrabold text-slate-900 pr-5 leading-snug">
        {ad.title}
      </p>
      {ad.body && (
        <p className="text-xs font-medium text-slate-500 leading-relaxed">
          {ad.body}
        </p>
      )}
      <CtaButton ad={ad} onCta={onCta} className="mt-1.5 h-8 px-3 self-start" />
    </div>
  </div>
);

const BannerAd = ({ ad, onDismiss, onCta }) => (
  <div className="relative w-[min(340px,calc(100vw-24px))] bg-white rounded-2xl border border-slate-200/80 shadow-[0_12px_40px_-8px_rgba(2,6,23,0.25)] px-3 py-2.5 flex items-center gap-3">
    {ad.image_download_url && (
      <img
        src={ad.image_download_url}
        alt=""
        className="w-11 h-11 rounded-xl object-cover shrink-0"
      />
    )}
    <div className="flex-1 min-w-0">
      <p className="text-xs font-extrabold text-slate-900 truncate">
        {ad.title}
      </p>
      {ad.body && (
        <p className="text-[10px] font-medium text-slate-500 truncate">
          {ad.body}
        </p>
      )}
    </div>
    <CtaButton ad={ad} onCta={onCta} className="h-7 px-2.5 shrink-0" />
    <CloseBtn onDismiss={onDismiss} />
  </div>
);

const ChipAd = ({ ad, onDismiss, onCta }) => (
  <div
    className="relative max-w-[min(300px,calc(100vw-24px))] bg-white rounded-2xl border shadow-[0_10px_30px_-6px_rgba(2,6,23,0.22)] pl-3.5 pr-2 py-2 flex items-center gap-2.5"
    style={{ borderColor: alpha(ad.color, 0.35) }}
  >
    <span
      className="w-1.5 h-1.5 rounded-full shrink-0"
      style={{ backgroundColor: ad.color }}
    />
    <p className="text-xs font-extrabold text-slate-900 leading-snug">
      {ad.title}
    </p>
    {hasCta(ad) && (
      <button
        type="button"
        onClick={onCta}
        className="text-[11px] font-extrabold whitespace-nowrap cursor-pointer hover:opacity-80"
        style={{ color: ad.color }}
      >
        {ad.cta_label}
      </button>
    )}
    <CloseBtn onDismiss={onDismiss} />
  </div>
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
  const align = POSITION_ALIGN[ad.position] || POSITION_ALIGN.bottom_right;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className={`fixed inset-0 z-[80] pointer-events-none flex p-3 sm:p-4 pt-20 pb-24 ${align}`}
    >
      <motion.div
        initial={{ ...offset }}
        animate={{ x: 0, y: 0 }}
        exit={{ ...offset }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="pointer-events-auto"
      >
        <PromoAdCard ad={ad} onDismiss={onDismiss} onCta={onCta} />
      </motion.div>
    </motion.div>
  );
}
