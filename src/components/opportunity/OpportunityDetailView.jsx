import React from "react";
import { Loader2 } from "lucide-react";
import { OpportunityHeader, OpportunityBlocks } from "./OpportunityBlocks";
import { oppAlpha } from "./opportunityTheme";

// The candidate opportunity detail page body — shared between the real
// select_opportunity step and the admin 414×896 live preview so the preview
// is pixel-accurate. `preview` mode disables the actions (no writes).
const OpportunityDetailView = ({
  opportunity,
  choosing = false,
  error = "",
  onChoose,
  onBack,
  preview = false,
}) => (
  <div
    className={`flex-1 ${preview ? "px-4" : "px-4 sm:px-6"} pt-6 pb-8 flex flex-col gap-5 min-h-full`}
    style={{
      background: `linear-gradient(270deg, #ffffff 0%, ${oppAlpha(opportunity?.color, 0.14)} 100%)`,
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
    <div className="mt-auto pt-4 flex flex-col gap-2">
      <button
        type="button"
        onClick={onChoose}
        disabled={choosing || preview}
        className="w-full h-12 bg-[#002856] hover:bg-[#07192f] disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer border-none flex items-center justify-center gap-2"
      >
        {choosing && <Loader2 className="w-4 h-4 animate-spin" />}
        {choosing ? "Selecting…" : "Choose this path"}
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
  </div>
);

export default OpportunityDetailView;
