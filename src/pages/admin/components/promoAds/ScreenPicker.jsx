import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { APP_SCREENS } from "../../../../components/promoAds/promoAdConfig";

// Searchable dropdown of app screens for the "Open app screen" CTA.
const ScreenPicker = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef(null);
  const selected = APP_SCREENS.find((s) => s.path === value);

  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const needle = q.trim().toLowerCase();
  const matches = APP_SCREENS.filter(
    (s) =>
      !needle ||
      s.label.toLowerCase().includes(needle) ||
      s.path.toLowerCase().includes(needle) ||
      s.group.toLowerCase().includes(needle),
  );
  const groups = [...new Set(matches.map((s) => s.group))];

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="h-9 px-3 w-full bg-white border border-gray-200 rounded-xl text-xs font-medium text-slate-700 text-left flex items-center justify-between gap-2 cursor-pointer outline-none disabled:opacity-50"
      >
        <span className={selected || value ? "" : "text-slate-300"}>
          {selected ? selected.label : value || "Pick a screen"}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-300 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {value && (
        <p className="text-[9px] font-mono text-slate-400 mt-1 px-0.5">
          {selected?.path || value}
        </p>
      )}
      {open && (
        <div className="promo-picker-drop absolute top-full mt-1 left-0 right-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              style={{ outline: "none", boxShadow: "none" }}
              className="h-9 pl-8 pr-3 w-full text-xs font-medium text-slate-700 placeholder:text-slate-300"
              placeholder="Search screens…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {groups.length === 0 && (
              <p className="px-3 py-3 text-[11px] font-medium text-slate-400">
                No screens match “{q}”
              </p>
            )}
            {groups.map((g) => (
              <div key={g}>
                <p className="px-3 pt-2.5 pb-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-300">
                  {g}
                </p>
                {matches
                  .filter((s) => s.group === g)
                  .map((s) => (
                    <button
                      key={s.path}
                      type="button"
                      onClick={() => {
                        onChange(s.path);
                        setQ("");
                        setOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 flex items-center justify-between gap-2 text-left cursor-pointer outline-none hover:bg-slate-50 ${
                        value === s.path ? "bg-[#002856]/5" : ""
                      }`}
                    >
                      <span className="text-[11px] font-bold text-slate-700">
                        {s.label}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">
                        {s.path}
                      </span>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenPicker;
