import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader2, Lock } from "lucide-react";

const MENU_WIDTH = 240;

// Compact pill trigger + menu for table rows. Options:
// { value, label, name, desc, dot, trigger, tag?, disabled?, disabledDesc? }.
// The table scrolls inside a modal, so the menu lives in a portal placed
// against the trigger, flipping up near the bottom of the screen.
export default function PillDropdown({
  value,
  options,
  onPick,
  saving = false,
  locked = false,
  lockedTitle,
  heading,
  ariaLabel,
  className = "min-w-[92px]",
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [active, setActive] = useState(-1);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const selected = options.find((o) => o.value === value) || options[0];

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    const menuH = menuRef.current?.offsetHeight || 180;
    const up = r.bottom + 6 + menuH > window.innerHeight - 8 && r.top - 6 - menuH > 8;
    setPos({
      left: Math.min(Math.max(8, r.left), window.innerWidth - MENU_WIDTH - 8),
      top: up ? r.top - 6 - menuH : r.bottom + 6,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    setActive(options.findIndex((o) => o.value === value));
    const close = () => setOpen(false);
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) close();
    };
    const onScroll = (e) => {
      if (!menuRef.current?.contains(e.target)) close();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
    // options/value only seed the highlight when the menu opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pick = (o) => {
    if (!o || o.disabled) return;
    setOpen(false);
    if (o.value !== value) onPick(o.value);
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (["ArrowDown", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    const step = (dir) => {
      e.preventDefault();
      let i = active;
      for (let n = 0; n < options.length; n += 1) {
        i = (i + dir + options.length) % options.length;
        if (!options[i].disabled) break;
      }
      setActive(i);
    };
    if (e.key === "ArrowDown") step(1);
    else if (e.key === "ArrowUp") step(-1);
    else if (e.key === "Escape" || e.key === "Tab") setOpen(false);
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(options[active]);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={saving || locked}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${ariaLabel}: ${selected?.name}`}
        title={locked ? lockedTitle : undefined}
        className={`inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold shadow-xs transition hover:brightness-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-70 ${selected?.trigger} ${open ? "ring-2 ring-indigo-100" : ""} ${className}`}
      >
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${selected?.dot}`} />
        )}
        <span className="flex-1 truncate text-left">{saving ? "Saving…" : selected?.label}</span>
        {locked ? (
          <Lock className="h-3 w-3 opacity-60" />
        ) : (
          <ChevronDown className={`h-3 w-3 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={heading}
            style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, width: MENU_WIDTH }}
            className="fixed z-[70] max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5"
          >
            <div className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {heading}
            </div>
            {options.map((o, i) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                disabled={o.disabled}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(o)}
                className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  active === i && !o.disabled ? "bg-slate-50" : ""
                }`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${o.dot}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    {o.name}
                    {o.tag}
                  </span>
                  {(o.desc || o.disabled) && (
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                      {o.disabled && o.disabledDesc ? o.disabledDesc : o.desc}
                    </span>
                  )}
                </span>
                {o.value === value && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
