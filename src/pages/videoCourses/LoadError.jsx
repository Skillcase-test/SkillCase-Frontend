import { RefreshCw } from "lucide-react";

// Shown instead of the empty state when the list could not be fetched
export default function LoadError({ onRetry }) {
  return (
    <div className="text-center text-slate-500 py-16 px-4 text-sm flex flex-col items-center gap-3">
      <p>Couldn't load this right now. Check your connection.</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#002856] px-4 py-2 text-xs font-semibold text-white active:scale-95 transition-transform"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Try again
      </button>
    </div>
  );
}
