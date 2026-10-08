import { ArrowLeft } from "lucide-react";

// Sub-header bar used on every Ireland step screen — same layout as the
// German pipeline's ("Back" left, funnel label right).
const StepSubHeader = ({ onBack, label = "Ireland Jobs" }) => (
  <div className="w-full flex items-center justify-between mb-4">
    <button
      onClick={onBack}
      className="flex items-center gap-1 text-slate-800 text-sm font-semibold hover:text-black cursor-pointer bg-transparent border-none p-0"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>Back</span>
    </button>
    <span className="text-slate-400 text-sm font-semibold">{label}</span>
  </div>
);

export default StepSubHeader;
