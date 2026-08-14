import { createPortal } from "react-dom";
import { X } from "lucide-react";

const SIZES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

/**
 * Shared portal modal for the scholarship admin.
 *  - `size`: sm | md | lg | xl
 *  - `icon`: optional leading icon node rendered in a tinted square
 *  - `footer`: optional footer node (rendered in a separated footer bar)
 */
export default function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = "md",
  icon,
}) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-4 overflow-y-auto py-10">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${SIZES[size] || SIZES.md} animate-in fade-in zoom-in-95 duration-150`}
      >
        <div className="px-6 pt-5 pb-3 flex items-start justify-between border-b border-slate-100">
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <div className="w-9 h-9 rounded-xl bg-[#eef2f6] flex items-center justify-center text-[#002856] shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-800">{title}</h2>
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
