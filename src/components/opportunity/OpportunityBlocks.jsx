import React from "react";
import { ArrowRight, Info, ChevronRight } from "lucide-react";
import OpportunityIcon from "./OpportunityIcon";
import OpportunityImage from "./OpportunityImage";
import {
  oppAlpha,
  oppShade,
  oppIsDark,
  oppSolidTint,
} from "./opportunityTheme";

// Dynamic horizontal scroll wrapper: calculates overflow in real-time
// across all device screen sizes. Shows a subtle nudge icon and edge fade
// ONLY when the content actually overflows the screen.
const ScrollWrapper = ({ children, className = "" }) => {
  const scrollRef = React.useRef(null);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [scrollable, setScrollable] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setScrollable(scrollWidth > clientWidth + 1);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  React.useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(checkScroll);
      ro.observe(el);
      // Also watch the content: lazy-loaded icons and live admin edits change
      // scrollWidth without resizing the container itself.
      if (el.firstElementChild) ro.observe(el.firstElementChild);
      return () => ro.disconnect();
    }
  }, [checkScroll]);

  // Desktop wheels scroll vertically, which never moves an overflow-x
  // container — translate the dominant delta into scrollLeft. Native
  // non-passive listener is required: React's synthetic onWheel is passive
  // and cannot preventDefault. At the scroll edges the wheel passes through
  // untouched so the page itself keeps scrolling.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      const unit = e.deltaMode === 1 ? 16 : 1;
      const delta =
        (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * unit;
      if (!delta) return;
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return;
      e.preventDefault();
      el.scrollLeft += delta;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Grab-and-drag scrolling for pointer users — the desktop equivalent of the
  // touch swipe these strips already support. Listeners live on window so the
  // drag keeps tracking even when the cursor leaves the strip.
  const [dragging, setDragging] = React.useState(false);
  const dragRef = React.useRef({ startX: 0, startLeft: 0 });

  const onMouseDown = (e) => {
    const el = scrollRef.current;
    if (e.button !== 0 || !el || el.scrollWidth <= el.clientWidth + 1) return;
    dragRef.current = { startX: e.clientX, startLeft: el.scrollLeft };
    setDragging(true);
  };

  React.useEffect(() => {
    if (!dragging) return undefined;
    const el = scrollRef.current;
    const onMove = (e) => {
      // A drag always wins over text selection — drop any selection the
      // press started before it became a swipe.
      window.getSelection?.().removeAllRanges();
      el.scrollLeft =
        dragRef.current.startLeft - (e.clientX - dragRef.current.startX);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  return (
    <div className="relative w-full overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        onMouseDown={onMouseDown}
        className={`w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          scrollable ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""
        } ${dragging ? "select-none" : ""} ${className}`}
      >
        {children}
      </div>
      {/* Subtle dynamic right nudge hint (only appears if content overflows) */}
      <div
        className={`pointer-events-none absolute right-0 top-0 bottom-0 w-7 bg-gradient-to-l from-white/95 via-white/70 to-transparent z-20 flex items-center justify-end pr-0.5 transition-opacity duration-200 ${
          canScrollRight ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="w-4 h-4 rounded-full bg-slate-100 border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-500">
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
};

// Renders the dynamic blocks admins compose per opportunity. These same
// components render the admin live-preview — the preview is pixel-accurate
// because it IS the candidate UI. Compact typography throughout: these pages
// carry a lot of information on a small screen.

// --- Header (fixed, not a reorderable block) --------------------------------
// Same layout as the listing page hero: title + description on the left,
// image on the right — plain object-contain, no border/frame. Points pills
// stay on the listing cards only; the detail header keeps just title + desc.
export const OpportunityHeader = ({ opportunity }) => (
  <div className="w-full flex items-center gap-3">
    <div className="flex-1 min-w-0 flex flex-col gap-1 text-left">
      <h2 className="text-[#002856] text-lg font-bold tracking-tight leading-snug">
        {opportunity?.title}
      </h2>
      {opportunity?.short_description ? (
        <p className="text-[#002856]/70 text-xs font-medium leading-relaxed">
          {opportunity.short_description}
        </p>
      ) : null}
    </div>
    <OpportunityImage
      src={opportunity?.image_download_url}
      alt={opportunity?.title || "Opportunity"}
      className="w-24 h-24 shrink-0"
    />
  </div>
);

// --- stats_grid: banner of labelled facts (duration, fee, …) -----------------
const StatsGridBlock = ({ block, color }) => (
  <div
    className={`w-full shadow-sm ${block.title ? "rounded-b-lg rounded-tr-lg rounded-tl-none" : "rounded-lg"} p-2.5 grid grid-cols-2 gap-2`}
    style={{ backgroundColor: oppSolidTint(color, 0.08) }}
  >
    {block.items.map((item, i) => (
      <div key={i} className="flex items-start gap-1.5 min-w-0">
        <span
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
          style={{
            backgroundColor: oppSolidTint(color, 0.18),
            color: oppShade(color, 0.4),
          }}
        >
          <OpportunityIcon name={item.icon} className="w-3.5 h-3.5" />
        </span>
        <div className="min-w-0 flex-1 flex flex-col text-left">
          <p
            className="text-[11px] font-bold leading-snug break-normal"
            style={{ color: oppShade(color, 0.35) }}
          >
            {item.value}
          </p>
          <p className="text-[9px] text-slate-500 font-medium leading-tight break-normal mt-0.5">
            {item.label}
          </p>
        </div>
      </div>
    ))}
  </div>
);

// --- kv_table: icon + label left, value right-aligned ------------------------
const KVTableBlock = ({ block, color }) => (
  <div
    className={`w-full bg-white ${block.title ? "rounded-b-lg rounded-tr-lg rounded-tl-none" : "rounded-lg"} border border-slate-200/80 shadow-2xs px-3.5 py-1 divide-y divide-slate-100`}
  >
    {block.rows.map((row, i) => (
      <div key={i} className="flex items-center gap-2 py-2.5">
        {row.icon && (
          <span className="shrink-0" style={{ color: oppShade(color, 0.5) }}>
            <OpportunityIcon name={row.icon} className="w-3.5 h-3.5" />
          </span>
        )}
        <span className="flex-1 min-w-0 text-[11px] font-semibold text-slate-700 leading-snug text-left break-normal">
          {row.label}
        </span>
        <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap shrink-0 text-right">
          {row.value}
        </span>
      </div>
    ))}
  </div>
);

// --- table: header row (darker tint) + body rows, 1–4 cols, single line -----
// Rows are {icon, cells[]} — the icon renders in the first column. Plain
// string-array rows (legacy) are normalized. First column is sticky left.
const TableBlock = ({ block, color }) => {
  const rows = (Array.isArray(block.rows) ? block.rows : []).map((r) =>
    Array.isArray(r)
      ? { icon: null, cells: r }
      : r || { icon: null, cells: [] },
  );
  const headerBg = oppSolidTint(color, 0.15);
  return (
    <div
      className={`w-full bg-white ${
        block.title
          ? "rounded-b-lg rounded-tr-lg rounded-tl-none"
          : "rounded-lg"
      } border border-slate-200/80 shadow-2xs overflow-hidden relative`}
    >
      <ScrollWrapper>
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: headerBg }}>
              {block.columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-3 py-2 text-[10px] font-bold whitespace-nowrap text-left ${
                    i === 0
                      ? "sticky left-0 z-10 border-r border-slate-200/70 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]"
                      : ""
                  }`}
                  style={{
                    color: oppShade(color, 0.35),
                    backgroundColor: headerBg,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-t border-slate-100">
                {block.columns.map((_, ci) => (
                  <td
                    key={ci}
                    className={`px-3 py-2 text-[10px] font-medium text-slate-600 whitespace-nowrap ${
                      ci === 0
                        ? "sticky left-0 z-10 bg-white border-r border-slate-100 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]"
                        : ""
                    }`}
                  >
                    {ci === 0 ? (
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        {row.icon && (
                          <span
                            className="shrink-0"
                            style={{ color: oppShade(color, 0.5) }}
                          >
                            <OpportunityIcon
                              name={row.icon}
                              className="w-3.5 h-3.5"
                            />
                          </span>
                        )}
                        <span>{row.cells?.[0] || "—"}</span>
                      </span>
                    ) : (
                      row.cells?.[ci] || "—"
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollWrapper>
    </div>
  );
};

// --- flow: rows of titles chained with arrows, clean full-width roadmap ---
const FlowBlock = ({ block, color }) => (
  <div
    className={`w-full bg-white ${
      block.title ? "rounded-b-lg rounded-tr-lg rounded-tl-none" : "rounded-lg"
    } border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col`}
  >
    <div className="p-3.5 flex flex-col gap-3">
      {block.rows.map((row, i) => (
        <div key={i} className="flex flex-col gap-1.5 w-full">
          {row.label && (
            <span
              className="text-[10px] font-bold uppercase tracking-wider text-left"
              style={{ color: oppShade(color, 0.45) }}
            >
              {row.label}
            </span>
          )}
          <ScrollWrapper>
            <div className="flex items-center gap-1.5 py-0.5 pr-2 w-max">
              {row.items.map((item, j) => (
                <React.Fragment key={j}>
                  <span
                    className="px-2.5 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap shadow-2xs"
                    style={{
                      backgroundColor: oppAlpha(color, 1),
                      color: oppIsDark(color)
                        ? "#ffffff"
                        : oppShade(color, 0.25),
                    }}
                  >
                    {item}
                  </span>
                  {j < row.items.length - 1 && (
                    <ArrowRight
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: oppShade(color, 0.5) }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </ScrollWrapper>
        </div>
      ))}
    </div>
    {block.note && (
      <div
        className="w-full px-3 py-2 flex items-start gap-2 border-t border-slate-100 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.03)]"
        style={{ backgroundColor: oppSolidTint(color, 0.06) }}
      >
        <Info
          className="w-3.5 h-3.5 mt-[1px] shrink-0"
          style={{ color: oppShade(color, 0.5) }}
        />
        <p className="text-[9.5px] font-medium text-slate-600 leading-tight text-left">
          {block.note}
        </p>
      </div>
    )}
  </div>
);

// --- process: vertical numbered steps, each with up to 4 points -------------
const ProcessBlock = ({ block, color }) => (
  <div
    className={`w-full bg-white ${block.title ? "rounded-b-lg rounded-tr-lg rounded-tl-none" : "rounded-lg"} border border-slate-200/80 shadow-2xs p-3.5 flex flex-col`}
  >
    {block.items.map((item, i) => (
      <div key={i} className="flex gap-3 items-stretch">
        <div className="flex flex-col items-center shrink-0 w-6">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shadow-2xs shrink-0"
            style={{
              backgroundColor: oppAlpha(color, 1),
              color: oppIsDark(color) ? "#ffffff" : oppShade(color, 0.25),
            }}
          >
            {i + 1}
          </div>
          {i < block.items.length - 1 && (
            <div
              className="w-[1.5px] flex-1 my-1"
              style={{ backgroundColor: oppAlpha(color, 0.3) }}
            />
          )}
        </div>
        <div
          className={`flex-1 min-w-0 text-left ${i < block.items.length - 1 ? "pb-4" : ""}`}
        >
          <h4 className="text-[#002856] text-[13px] font-bold leading-tight pt-0.5">
            {item.title}
          </h4>
          {item.points?.length > 0 && (
            <ul className="mt-1.5 flex flex-col gap-1">
              {item.points.map((point, j) => (
                <li key={j} className="flex items-start gap-1.5">
                  <span
                    className="w-1 h-1 rounded-full mt-[5px] shrink-0"
                    style={{ backgroundColor: oppShade(color, 0.5) }}
                  />
                  <span className="text-[10px] text-slate-600 font-medium leading-snug">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    ))}
  </div>
);

const BLOCK_COMPONENTS = {
  stats_grid: StatsGridBlock,
  kv_table: KVTableBlock,
  table: TableBlock,
  flow: FlowBlock,
  process: ProcessBlock,
};

// Renders an ordered blocks array in the opportunity's color theme. Every
// block with a title gets an attached tab notch seamlessly connected to the card top.
export const OpportunityBlocks = ({ blocks, color }) => {
  const list = Array.isArray(blocks) ? blocks : [];
  if (!list.length) return null;
  return (
    <div className="w-full flex flex-col gap-4">
      {list.map((block, i) => {
        const Cmp = BLOCK_COMPONENTS[block?.type];
        if (!Cmp) return null;
        const isStatsGrid = block?.type === "stats_grid";
        // Match the card body exactly (StatsGridBlock uses the same solid tint)
        // so the tab and card read as one surface over the page gradient.
        const bgTab = isStatsGrid ? oppSolidTint(color, 0.08) : "#ffffff";
        return (
          <div key={block.id || i} className="w-full flex flex-col items-start">
            {block.title ? (
              <div
                className="relative z-10 -mb-[1px] ml-0 px-3.5 py-1.5 rounded-tl-lg rounded-tr-md border-t border-l border-r border-slate-200/80 text-xs font-bold text-[#002856] inline-flex items-center gap-1.5 select-none shadow-[inset_0_1.5px_2.5px_rgba(0,0,0,0.07)]"
                style={{ backgroundColor: bgTab }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: oppShade(color, 0.4) }}
                />
                <span>{block.title}</span>
                {/* Right concave fillet shoulder */}
                <span
                  className="absolute -right-2.5 bottom-0 w-2.5 h-2.5 pointer-events-none"
                  style={{
                    backgroundColor: bgTab,
                    maskImage:
                      "radial-gradient(circle at 100% 0, transparent 10px, black 10px)",
                    WebkitMaskImage:
                      "radial-gradient(circle at 100% 0, transparent 10px, black 10px)",
                  }}
                />
              </div>
            ) : null}
            <Cmp block={block} color={color} />
          </div>
        );
      })}
    </div>
  );
};

export default OpportunityBlocks;
