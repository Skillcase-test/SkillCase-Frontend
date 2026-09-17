import React, { useEffect, useRef, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import OpportunityIcon from "../../../../components/opportunity/OpportunityIcon";

// Searchable picker over the full lucide icon set. The dynamic submodule is
// loaded on demand (import()), so the ~1,500-name registry only ships in the
// admin chunk — candidate bundles import DynamicIcon directly for the icons
// actually referenced by stored content.
let iconIndexPromise = null;
const loadIconIndex = () => {
  if (!iconIndexPromise) {
    iconIndexPromise = import("lucide-react/dynamic").then((m) => ({
      DynamicIcon: m.DynamicIcon,
      names: m.iconNames || [],
    }));
  }
  return iconIndexPromise;
};

const RESULT_CAP = 48;

const IconPicker = ({ value, onChange, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [icons, setIcons] = useState(null); // { DynamicIcon, names }
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open || icons) return;
    let alive = true;
    loadIconIndex().then((m) => alive && setIcons(m));
    return () => {
      alive = false;
    };
  }, [open, icons]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const names = icons?.names || [];
  const q = query.trim().toLowerCase();
  const matches = (q
    ? names.filter((n) => n.includes(q))
    : names
  ).slice(0, RESULT_CAP);

  const DynIcon = icons?.DynamicIcon;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="h-8 pl-2 pr-1.5 flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 hover:border-slate-300 disabled:opacity-50 cursor-pointer"
      >
        {value ? (
          <OpportunityIcon name={value} className="w-3.5 h-3.5" />
        ) : (
          <span className="text-slate-400">icon</span>
        )}
        {value && <span className="max-w-20 truncate">{value}</span>}
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-2 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 px-2 h-8 bg-slate-50 border border-slate-200 rounded-lg">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons…"
              className="w-full bg-transparent outline-none text-[11px] font-medium text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {!icons ? (
              <p className="text-[10px] text-slate-400 font-medium text-center py-4">
                Loading icon set…
              </p>
            ) : (
              <div className="grid grid-cols-6 gap-1">
                {matches.map((name) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                    }}
                    className={`aspect-square flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                      value === name
                        ? "border-[#083262] bg-blue-50 text-[#083262]"
                        : "border-transparent hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    <DynIcon name={name} className="w-4 h-4" />
                  </button>
                ))}
                {!matches.length && (
                  <p className="col-span-6 text-[10px] text-slate-400 font-medium text-center py-3">
                    No icons match “{query}”
                  </p>
                )}
              </div>
            )}
          </div>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="text-[10px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer text-left"
            >
              Remove icon
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default IconPicker;
