import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const TONE = {
  default:
    "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900",
  primary: "border-slate-900 bg-slate-900 text-white hover:bg-black",
  danger: "border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
  success: "border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50",
  info: "border-[#083262]/40 bg-white text-[#083262] hover:bg-blue-50",
};
const FEEDBACK_TONE = "border-emerald-300 bg-emerald-50 text-emerald-700";

// Compact table action button: shows only the icon until hovered, then expands
// to reveal the label. `alwaysShowLabel` pins the label open at a constant
// width for high-traffic actions. `confirmLabel` flashes a success state after
// click — use it for inline actions (copy, etc.) with no other visible result.
export default function IconActionButton({
  icon: Icon,
  label,
  onClick,
  tone = "default",
  disabled = false,
  confirmLabel = null,
  alwaysShowLabel = false,
  title,
}) {
  const [confirmed, setConfirmed] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleClick = () => {
    onClick?.();
    if (confirmLabel) {
      setConfirmed(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setConfirmed(false), 1600);
    }
  };

  const ActiveIcon = confirmed ? Check : Icon;
  const labelVisible = confirmed || alwaysShowLabel;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={title || label}
      className={`group/ib inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border px-2 transition-all duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-60 ${
        alwaysShowLabel ? "shrink-0" : ""
      } ${confirmed ? FEEDBACK_TONE : TONE[tone]}`}
    >
      <ActiveIcon className="h-4 w-4 shrink-0" />
      <span
        className={`overflow-hidden whitespace-nowrap text-xs font-semibold transition-all duration-300 ease-in-out ${
          labelVisible
            ? "ml-1.5 max-w-32 opacity-100"
            : "ml-0 max-w-0 opacity-0 group-hover/ib:ml-1.5 group-hover/ib:max-w-32 group-hover/ib:opacity-100"
        }`}
      >
        {confirmed ? confirmLabel : label}
      </span>
    </button>
  );
}
