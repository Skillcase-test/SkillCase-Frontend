import React from "react";
import { ArrowRight, AlertTriangle } from "lucide-react";
import OpportunityIcon from "./OpportunityIcon";
import { oppAlpha, oppShade, oppIsDark } from "./opportunityTheme";

// Renders the dynamic blocks admins compose per opportunity. These same
// components render the admin live-preview — the preview is pixel-accurate
// because it IS the candidate UI. Compact typography throughout: these pages
// carry a lot of information on a small screen.

// --- Header (fixed, not a reorderable block) --------------------------------
export const OpportunityHeader = ({ opportunity }) => {
  const color = opportunity?.color;
  return (
    <div className="w-full flex flex-col gap-3">
      {opportunity?.image_download_url && (
        <img
          src={opportunity.image_download_url}
          alt={opportunity.title || "Opportunity"}
          className="w-full aspect-[16/9] rounded-2xl object-cover border select-none"
          style={{ borderColor: oppAlpha(color, 0.25) }}
          draggable="false"
        />
      )}
      <div className="flex flex-col gap-1 text-left">
        <h2 className="text-[#002856] text-lg font-bold tracking-tight leading-snug">
          {opportunity?.title}
        </h2>
        {opportunity?.short_description ? (
          <p className="text-[#002856]/70 text-xs font-medium leading-relaxed">
            {opportunity.short_description}
          </p>
        ) : null}
      </div>
      {Array.isArray(opportunity?.points) && opportunity.points.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {opportunity.points.map((point, i) => (
            <span
              key={`${point}-${i}`}
              className="px-2 py-0.5 rounded-full text-[9px] font-semibold leading-tight whitespace-nowrap"
              style={{
                backgroundColor: oppAlpha(color, 0.12),
                color: oppShade(color, 0.45),
              }}
            >
              {point}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// --- stats_grid: banner of labelled facts (duration, fee, …) -----------------
const StatsGridBlock = ({ block, color }) => (
  <div
    className="w-full rounded-2xl p-3.5 grid grid-cols-2 gap-2.5"
    style={{ backgroundColor: oppAlpha(color, 0.1) }}
  >
    {block.items.map((item, i) => (
      <div key={i} className="flex items-center gap-2.5 min-w-0">
        <span
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: oppAlpha(color, 0.18), color: oppShade(color, 0.4) }}
        >
          <OpportunityIcon name={item.icon} className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <p
            className="text-[12px] font-bold leading-tight truncate"
            style={{ color: oppShade(color, 0.35) }}
          >
            {item.value}
          </p>
          <p className="text-[10px] text-slate-500 font-medium leading-tight truncate">
            {item.label}
          </p>
        </div>
      </div>
    ))}
  </div>
);

// --- kv_table: label left, value right-aligned, icon on the extreme right ----
const KVTableBlock = ({ block, color }) => (
  <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-2xs px-3.5 py-1 divide-y divide-slate-100">
    {block.rows.map((row, i) => (
      <div key={i} className="flex items-center gap-2 py-2.5">
        <span className="flex-1 min-w-0 text-[11px] font-semibold text-slate-700 truncate text-left">
          {row.label}
        </span>
        <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
          {row.value}
        </span>
        {row.icon && (
          <span
            className="shrink-0"
            style={{ color: oppShade(color, 0.5) }}
          >
            <OpportunityIcon name={row.icon} className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    ))}
  </div>
);

// --- table: header row (darker tint) + body rows, 1–4 cols, single line -----
const TableBlock = ({ block, color }) => (
  <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ backgroundColor: oppAlpha(color, 0.18) }}>
            {block.columns.map((col, i) => (
              <th
                key={i}
                className="px-3 py-2 text-[10px] font-bold whitespace-nowrap text-left"
                style={{ color: oppShade(color, 0.35) }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, ri) => (
            <tr key={ri} className="border-t border-slate-100">
              {block.columns.map((_, ci) => (
                <td
                  key={ci}
                  className="px-3 py-2 text-[10px] font-medium text-slate-600 whitespace-nowrap"
                >
                  {row[ci] || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// --- flow: rows of titles chained with arrows, row label at extreme right ---
const FlowBlock = ({ block, color }) => (
  <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5 flex flex-col gap-3">
    {block.rows.map((row, i) => (
      <div key={i} className="flex items-center gap-1.5">
        <div className="flex-1 flex items-center gap-1 min-w-0 overflow-x-auto">
          {row.items.map((item, j) => (
            <React.Fragment key={j}>
              <span
                className="px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap text-white"
                style={{
                  backgroundColor: oppAlpha(color, 1),
                  color: oppIsDark(color) ? "#ffffff" : oppShade(color, 0.25),
                }}
              >
                {item}
              </span>
              {j < row.items.length - 1 && (
                <ArrowRight
                  className="w-3 h-3 shrink-0"
                  style={{ color: oppShade(color, 0.5) }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        {row.label && (
          <span
            className="text-[10px] font-bold uppercase tracking-wide whitespace-nowrap shrink-0"
            style={{ color: oppShade(color, 0.4) }}
          >
            {row.label}
          </span>
        )}
      </div>
    ))}
    {block.note && (
      <div
        className="flex items-start gap-2 rounded-xl px-3 py-2"
        style={{ backgroundColor: oppAlpha(color, 0.08) }}
      >
        <AlertTriangle
          className="w-3.5 h-3.5 mt-0.5 shrink-0"
          style={{ color: oppShade(color, 0.45) }}
        />
        <p className="text-[10px] font-medium text-slate-600 leading-snug text-left">
          {block.note}
        </p>
      </div>
    )}
  </div>
);

// --- process: vertical numbered steps, each with up to 4 points -------------
const ProcessBlock = ({ block, color }) => (
  <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5 flex flex-col">
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
        <div className={`flex-1 min-w-0 text-left ${i < block.items.length - 1 ? "pb-4" : ""}`}>
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

// Renders an ordered blocks array in the opportunity's color theme.
export const OpportunityBlocks = ({ blocks, color }) => {
  const list = Array.isArray(blocks) ? blocks : [];
  if (!list.length) return null;
  return (
    <div className="w-full flex flex-col gap-3">
      {list.map((block, i) => {
        const Cmp = BLOCK_COMPONENTS[block?.type];
        if (!Cmp) return null;
        return <Cmp key={block.id || i} block={block} color={color} />;
      })}
    </div>
  );
};

export default OpportunityBlocks;
