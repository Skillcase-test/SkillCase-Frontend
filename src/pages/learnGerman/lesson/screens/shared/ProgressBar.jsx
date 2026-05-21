import { createContext, useContext } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const ProgressBarHostContext = createContext(false);

export function ProgressBarHostProvider({ children, enabled }) {
  return (
    <ProgressBarHostContext.Provider value={enabled}>
      {children}
    </ProgressBarHostContext.Provider>
  );
}

// progressRatio: 0–1 computed as screenIndex / totalScreens
// title: lesson title shown on the left
// level: proficiency level shown on the right
export default function ProgressBar({
  progressRatio,
  title,
  level,
  isHost = false,
  onBackClick,
  floating = false,
}) {
  const hasExternalHost = useContext(ProgressBarHostContext);
  if (hasExternalHost && !isHost) return null;

  const clampedRatio = Math.min(Math.max(progressRatio || 0, 0), 1);
  const progressText = `${Math.round(clampedRatio * 100)}%`;

  return (
    <div
      className={`w-full pr-4 pl-2 pt-2 pb-2 bg-white/70 border-b border-slate-200 shadow-sm/20 shrink-0 z-20 ${
        floating
          ? "fixed top-[55px] left-1/2 -translate-x-1/2 max-w-[500px]"
          : "relative"
      }`}
    >
      <div className="flex justify-between items-center mb-1 gap-2">
        <div className="flex items-center min-w-0 flex-1">
          {onBackClick && (
            <button
              onClick={onBackClick}
              className="w-7 h-7 rounded-md border-2 border-gray-400  flex items-center justify-center mr-2 shrink-0 hover:bg-gray-50 active:scale-95 transition-all"
              aria-label="Leave Lesson"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" strokeWidth={2} />
            </button>
          )}
          <div className="text-gray-900 text-[11px] font-medium truncate">
            {title || ""}
          </div>
        </div>
        <div className="text-zinc-500 text-[10px] font-medium shrink-0">
          {progressText}
        </div>
      </div>
      <div className="absolute w-[85%] h-1 right-3.5 bg-black/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-orange-400"
          animate={{ width: `${clampedRatio * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
