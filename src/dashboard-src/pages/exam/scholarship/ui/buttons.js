/**
 * Shared button class helpers for the scholarship admin (no JSX here —
 * plain class-name builders).
 */
export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#002856] text-white rounded-xl text-xs font-bold hover:bg-[#001e40] transition disabled:opacity-40 disabled:cursor-not-allowed",
  secondary:
    "inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold bg-white hover:text-[#002856] hover:border-[#002856] transition disabled:opacity-40 disabled:cursor-not-allowed",
  ghost:
    "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition",
  success:
    "inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition disabled:opacity-40",
  danger:
    "inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition disabled:opacity-40",
  dangerGhost:
    "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-500 text-[11px] font-bold hover:bg-red-50 transition",
  amber:
    "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-amber-200 text-amber-700 text-[11px] font-bold bg-white hover:bg-amber-50 transition",
  blueGhost:
    "inline-flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-[11px] font-bold hover:bg-blue-50 transition",
  dangerSmall:
    "inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 text-[11px] font-bold hover:bg-red-50 transition",
};

export const inputCls =
  "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#002856]/20 focus:border-[#002856]";

// inputCls renders at 42px (text-sm line + py-2.5 + border). Buttons that sit
// in the same row must pin this height — their smaller text-xs line height
// otherwise makes them visibly shorter than the inputs.
export const inputH = "h-[42px]";

export const labelCls = "block text-xs font-semibold text-slate-500 mb-1";
