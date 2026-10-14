import { m } from "framer-motion";

export default function GuideSpotlight({ rect, radius = 22, onClick, children }) {
  const padding = 12;
  const top = Math.max(0, rect.top - padding);
  const left = Math.max(0, rect.left - padding);
  const width = rect.width + padding * 2;
  const height = rect.height + padding * 2;
  const calloutTop = top > 118 ? top - 120 : top + height + 36;
  const calloutLeft = Math.min(
    Math.max(16, left + width / 2 - 150),
    Math.max(16, window.innerWidth - 316),
  );
  
  // Calculate exact horizontal offset for the arrow pointer to match the highlighted circle
  const targetCenter = left + width / 2;
  const arrowLeft = Math.min(Math.max(24, targetCenter - calloutLeft), 276);

  // A plain dim: a backdrop blur re-blurs every frame of whatever is behind
  // it (the playing video, animations), which is heavy on low-end phones
  const blurPanelClass = "absolute bg-slate-950/60";

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

      <m.button
        type="button"
        onClick={onClick}
        className="absolute bg-transparent cursor-pointer"
        style={{ top, left, width, height, borderRadius: radius }}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <span className="absolute inset-0 border-[3px] border-white rounded-[inherit] shadow-[0_0_0_1px_rgba(255,255,255,0.75),0_18px_45px_rgba(0,0,0,0.3)]" />
        {/* The pulse only scales and fades, so it runs off the main thread */}
        <span className="spotlight-ring absolute inset-0 rounded-[inherit] border-[3px] border-white/80" />
      </m.button>

      <m.div
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
          className={`absolute h-4 w-4 -translate-x-1/2 rotate-45 bg-white ${
            top > 118 ? "-bottom-2" : "-top-2"
          }`}
          style={{ left: `${arrowLeft}px` }}
        />
        {children}
      </m.div>
    </div>
  );
}
