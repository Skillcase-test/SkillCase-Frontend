import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export const CONTROL_BASE =
  "h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

export function ControlInput({ className = "", leftIcon = null, ...props }) {
  return (
    <div className="relative">
      {leftIcon ? (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
          {leftIcon}
        </span>
      ) : null}
      <input
        {...props}
        className={`${CONTROL_BASE} ${leftIcon ? "pl-9" : ""} ${className}`}
      />
    </div>
  );
}

export function ControlSelect({ className = "", children, ...props }) {
  return (
    <select {...props} className={`${CONTROL_BASE} pr-8 ${className}`}>
      {children}
    </select>
  );
}

export function ControlButton({
  variant = "secondary",
  className = "",
  children,
  ...props
}) {
  const variants = {
    primary:
      "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 disabled:border-slate-300 disabled:bg-slate-300",
    secondary:
      "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400",
    danger:
      "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:text-rose-300",
    ghost: "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200",
  };
  return (
    <button
      {...props}
      className={`inline-flex h-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function ActionChip({
  variant = "secondary",
  active = false,
  className = "",
  ...props
}) {
  const variantClass = active
    ? "!border-slate-900 !bg-slate-900 !text-white hover:!bg-slate-800"
    : variant === "danger"
      ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
      : variant === "success"
        ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        : variant === "warning"
          ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-8 items-center justify-center rounded-lg border px-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClass} ${className}`}
    />
  );
}

export function ControlDropdown({
  id,
  "aria-label": ariaLabel,
  value,
  onChange,
  options,
  placeholder,
  searchable = false,
  className = "",
  disabled = false,
  compact = false,
  fixedMenu = false,
}) {
  const [open, setOpen] = useState(false);
  const [, setQuery] = useState("");
  const [typeahead, setTypeahead] = useState("");
  const [menuRect, setMenuRect] = useState(null);
  const wrapRef = useRef(null);
  const selected = options.find((x) => String(x.value) === String(value));
  const typeaheadTimerRef = useRef(null);

  useEffect(() => {
    function handleOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const filtered = useMemo(() => {
    return options;
  }, [options]);

  useEffect(() => {
    if (!searchable) return;
    setQuery("");
  }, [searchable, selected?.label, value]);

  useEffect(() => {
    return () => {
      if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
    };
  }, []);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => {
          if (fixedMenu && wrapRef.current) {
            const rect = wrapRef.current.getBoundingClientRect();
            setMenuRect({ top: rect.bottom + 8, left: rect.left, width: rect.width });
          }
          setOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (!searchable || disabled) return;
          if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
          const next = `${typeahead}${e.key}`.toLowerCase();
          setTypeahead(next);
          const match = options.find((o) =>
            String(o.label || "")
              .toLowerCase()
              .includes(next),
          );
          if (match) {
            onChange(String(match.value));
            setQuery(next);
          }
          if (typeaheadTimerRef.current)
            clearTimeout(typeaheadTimerRef.current);
          typeaheadTimerRef.current = setTimeout(() => setTypeahead(""), 500);
        }}
        className={`${compact ? "h-8 rounded-lg px-2.5 text-xs font-semibold text-slate-700" : CONTROL_BASE} flex w-full items-center justify-between border border-slate-300 bg-white outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
        style={compact ? { paddingLeft: "10px", paddingRight: "10px" } : undefined}
      >
        <span className="truncate text-left">
          {selected?.label || placeholder || "Select"}
        </span>
        <ChevronDown size={16} className="ml-2 shrink-0 text-slate-500" />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={`${fixedMenu ? "fixed" : "absolute mt-2 w-full"} z-50 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg`}
          style={fixedMenu && menuRect ? { top: menuRect.top, left: menuRect.left, width: menuRect.width } : undefined}
        >
          <div className="max-h-56 overflow-auto">
            {filtered.map((o) => (
              <button
                key={String(o.value)}
                type="button"
                role="option"
                aria-selected={String(value) === String(o.value)}
                onClick={() => {
                  onChange(String(o.value));
                  setOpen(false);
                  if (searchable) setQuery(o.label);
                }}
                className={`block w-full rounded-lg px-2 py-2 text-left text-sm ${
                  String(value) === String(o.value)
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {o.label}
              </button>
            ))}
            {filtered.length === 0 ? (
              <p className="px-2 py-2 text-xs text-slate-500">
                No options found
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
