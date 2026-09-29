import { treatmentFor, tileArt, heroArt } from "../lib/vocabArt";
import Img from "./Img";

/* One slot, several treatments — photo | numeral | swatch | weekday | usage |
 * contrast — so a screen mixing them reads as a designed set rather than one
 * with images missing. Returns null for bare function words (an empty frame
 * is worse than no frame; Teach checks and drops the slot).
 * Tailwind rebuild of the reference WordArt. */

export function WordArt({ de, en, pic, size = 84, variant = "tile" }) {
  const t = treatmentFor(de, pic);
  const src = variant === "hero" ? heroArt(de) || tileArt(de) : tileArt(de);

  if (t.kind === "photo" && src) {
    return (
      <span
        className={`block overflow-hidden rounded-2xl bg-slate-100 ${
          variant === "hero" ? "w-full" : "w-full max-w-[220px]"
        }`}
      >
        <Img src={src} alt={en || de} loading="lazy" className="aspect-[4/3] w-full" />
      </span>
    );
  }
  if (t.kind === "numeral") {
    return (
      <span
        className="inline-flex items-center justify-center rounded-2xl bg-indigo-50 ring-1 ring-indigo-200"
        style={{ width: size, height: size }}
      >
        <b className="text-2xl font-extrabold text-indigo-700">{t.value}</b>
      </span>
    );
  }
  if (t.kind === "swatch") {
    return (
      <span
        className="inline-flex items-center justify-center rounded-2xl ring-1 ring-slate-200"
        style={{ width: size, height: size }}
      >
        <i className="block h-[70%] w-[70%] rounded-xl" style={{ background: t.value }} />
      </span>
    );
  }
  if (t.kind === "weekday") {
    return (
      <span
        className="inline-flex flex-wrap items-center justify-center gap-1 rounded-2xl bg-white px-2 py-1.5 ring-1 ring-slate-200"
        style={{ minHeight: size }}
      >
        {t.days.map((d, i) => (
          <i
            key={d}
            className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold not-italic ${
              i === t.index ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
            }`}
          >
            {d}
          </i>
        ))}
      </span>
    );
  }
  if (t.kind === "usage") {
    const [before, target, after] = t.parts;
    return (
      <span
        className={`inline-block rounded-2xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200 ${
          variant === "hero" ? "w-full text-left" : ""
        }`}
        style={{ minHeight: size }}
      >
        {variant === "hero" && (
          <em className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-amber-600 not-italic">
            You'll hear it like this
          </em>
        )}
        <span className="block text-[15px] leading-snug text-slate-800">
          {before && <i className="text-slate-500">{before}</i>}
          <b className="text-indigo-700">{target}</b>
          {after && <i className="text-slate-500">{after}</i>}
        </span>
        {variant === "hero" && t.gloss && (
          <span className="mt-1 block text-xs text-slate-500">{t.gloss}</span>
        )}
      </span>
    );
  }
  if (t.kind === "contrast") {
    return (
      <span
        className="inline-block w-full max-w-[240px] rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200"
        style={{ minHeight: size }}
      >
        {t.lines.map(([line, gloss], i) => (
          <span
            key={line}
            className={`flex items-baseline justify-between gap-2 py-0.5 text-left ${
              i ? "border-t border-dashed border-slate-200" : ""
            }`}
          >
            <b className="text-[15px] font-semibold text-slate-800">{line}</b>
            <i className="text-xs text-slate-500">{gloss}</i>
          </span>
        ))}
      </span>
    );
  }
  // kind === "word": nothing to picture and no sentence the learner could
  // read yet — the caller drops the hero rather than restating the word.
  return null;
}

export default WordArt;
