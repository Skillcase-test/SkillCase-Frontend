import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X, ChevronDown, Plus, Pencil, Trash2, Check } from "lucide-react";
import toast from "react-hot-toast";
import { Spinner } from "./common";

export function ControlDropdown({
  id,
  "aria-label": ariaLabel,
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  className = "",
  disabled = false,
  compact = false,
  searchable = false,
  searchPlaceholder = "Search options...",
  searchValue,
  onSearchChange,
  loading = false,
  usePortal = true,
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 0,
    minWidth: 240,
    openUpwards: false,
  });
  const [internalSearch, setInternalSearch] = useState("");
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);

  const activeSearch = searchValue !== undefined ? searchValue : internalSearch;
  const isSearchable = searchable || Boolean(onSearchChange) || options.length > 8;

  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "object" && opt !== null) {
        return { value: String(opt.value), label: String(opt.label ?? opt.value) };
      }
      return { value: String(opt), label: String(opt) };
    });
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (onSearchChange) return normalizedOptions;
    const q = activeSearch.trim().toLowerCase();
    if (!q) return normalizedOptions;
    return normalizedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q),
    );
  }, [normalizedOptions, activeSearch, onSearchChange]);

  const selected = normalizedOptions.find((x) => String(x.value) === String(value));

  const updateCoords = () => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = 280;
    const openUpwards = spaceBelow < estimatedHeight && rect.top > estimatedHeight;
    setCoords({
      top: openUpwards ? rect.top - 8 : rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
      width: rect.width,
      minWidth: Math.max(rect.width, 240),
      openUpwards,
    });
  };

  useEffect(() => {
    if (open) {
      updateCoords();
      function handleScroll(e) {
        if (menuRef.current && menuRef.current.contains(e.target)) return;
        updateCoords();
      }
      function handleResize() {
        updateCoords();
      }
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [open]);

  useEffect(() => {
    function handleOutside(event) {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [open]);

  const menuContent = (
    <div
      ref={menuRef}
      role="listbox"
      aria-label={ariaLabel}
      className={`fixed z-[9999] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 ${
        coords.openUpwards ? "origin-bottom" : "origin-top"
      }`}
      style={{
        top: coords.openUpwards ? "auto" : `${coords.top}px`,
        bottom: coords.openUpwards
          ? `${window.innerHeight - coords.top}px`
          : "auto",
        left: `${coords.left}px`,
        width: `${Math.max(coords.width, coords.minWidth || 240)}px`,
      }}
    >
      {isSearchable && (
        <div className="p-2.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-300 px-3 py-2 focus-within:border-[#083262] focus-within:ring-1 focus-within:ring-[#083262] transition">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              autoFocus
              placeholder={searchPlaceholder}
              value={activeSearch}
              onChange={(e) => {
                const val = e.target.value;
                setInternalSearch(val);
                if (onSearchChange) onSearchChange(val);
              }}
              className="w-full text-xs text-slate-800 placeholder-slate-400 outline-none focus:outline-none focus:ring-0 border-0 ring-0 focus-visible:outline-none focus-visible:ring-0 bg-transparent font-medium"
              style={{ outline: "none", boxShadow: "none", border: "none" }}
            />
            {loading && <Spinner size="sm" color="text-[#083262]" />}
            {activeSearch && !loading && (
              <button
                type="button"
                onClick={() => {
                  setInternalSearch("");
                  if (onSearchChange) onSearchChange("");
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
        {filteredOptions.map((o) => {
          const isSelected = String(value) === String(o.value);
          return (
            <button
              key={String(o.value)}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold cursor-pointer transition ${
                isSelected
                  ? "bg-[#083262] text-white"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="truncate">{o.label}</span>
              {isSelected && <Check size={14} className="shrink-0 text-white ml-2" />}
            </button>
          );
        })}
        {filteredOptions.length === 0 && (
          <p className="px-4 py-4 text-xs text-slate-400 text-center font-medium">
            {loading ? "Searching candidates..." : "No matching options found"}
          </p>
        )}
      </div>

      {isSearchable && (
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
          <span>{filteredOptions.length} option{filteredOptions.length === 1 ? "" : "s"}</span>
          <span>Press Esc to close</span>
        </div>
      )}
    </div>
  );

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
          if (!open) {
            updateCoords();
          }
          setOpen((v) => !v);
        }}
        className={`flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white ${
          compact ? "h-9 px-3 text-xs" : "px-3.5 py-2.5 text-xs"
        } font-medium text-slate-800 outline-none transition focus:border-[#083262] focus:ring-1 focus:ring-[#083262] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer shadow-xs`}
      >
        <span className="truncate text-left font-medium">
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`ml-2 shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180 text-[#083262]" : ""
          }`}
        />
      </button>

      {open && (usePortal ? createPortal(menuContent, document.body) : menuContent)}
    </div>
  );
}

export function PrimaryButton({ children, icon: Icon, loading = false, disabled = false, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#083262] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#052243] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      {...props}
    >
      {loading ? <Spinner size="sm" color="text-white" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function SecondaryButton({ children, icon: Icon, loading = false, disabled = false, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      {...props}
    >
      {loading ? <Spinner size="sm" /> : Icon ? <Icon className="h-4 w-4 text-slate-500" /> : null}
      {children}
    </button>
  );
}

export function ActionButton({ children, variant = "default", icon: Icon, disabled = false, ...props }) {
  const base =
    "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
  const variants = {
    default: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    danger: "border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100",
    primary: "border-blue-200 bg-blue-50/50 text-[#083262] hover:bg-blue-100",
    success: "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100",
  };

  return (
    <button type="button" disabled={disabled} className={`${base} ${variants[variant] || variants.default}`} {...props}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search...", onClear }) {
  return (
    <div className="relative flex items-center">
      <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] shadow-sm transition"
      />
      {value && (
        <button
          type="button"
          onClick={onClear || (() => onChange(""))}
          className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function DynamicDropdownField({
  label,
  field,
  value,
  options = [],
  onChange,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  readOnly = false,
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingVal, setEditingVal] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
        setEditingId(null);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleOutside);
      return () => document.removeEventListener("mousedown", handleOutside);
    }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && open) {
        setOpen(false);
        setEditingId(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const optionValues = options.map((o) =>
    typeof o === "string" ? o : o.option_value,
  );
  const hasCurrentValueInOptions = !value || optionValues.includes(value);

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const val = typeof opt === "string" ? opt : opt.option_value;
      return String(val || "").toLowerCase().includes(q);
    });
  }, [options, searchQuery]);

  const exactMatchExists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return options.some((opt) => {
      const val = typeof opt === "string" ? opt : opt.option_value;
      return String(val || "").trim().toLowerCase() === q;
    });
  }, [options, searchQuery]);

  const handleAdd = async (e) => {
    if (e) e.stopPropagation();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setLoadingAction(true);
    try {
      await onAddOption(field, trimmed);
      onChange(trimmed);
      setSearchQuery("");
      setOpen(false);
      toast.success(`Option "${trimmed}" added`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add option");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUpdate = async (e, id) => {
    if (e) e.stopPropagation();
    const trimmed = editingVal.trim();
    if (!trimmed) return;
    setLoadingAction(true);
    try {
      await onUpdateOption(id, trimmed);
      const targetOpt = options.find((o) => o.id === id);
      if (targetOpt && value === targetOpt.option_value) {
        onChange(trimmed);
      }
      setEditingId(null);
      setEditingVal("");
      toast.success("Option updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update option");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async (e, id, optVal) => {
    if (e) e.stopPropagation();
    setLoadingAction(true);
    try {
      await onDeleteOption(id);
      if (value === optVal) {
        onChange("");
      }
      toast.success(`Option "${optVal}" removed`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete option");
    } finally {
      setLoadingAction(false);
    }
  };

  const displayPlaceholder = placeholder || `Select ${label.toLowerCase()}...`;

  return (
    <div className="space-y-1 relative" ref={wrapRef}>
      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
        {label}
      </label>

      <div className="relative">
        <button
          type="button"
          disabled={readOnly}
          onClick={() => {
            setOpen((v) => !v);
            setEditingId(null);
          }}
          className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-left flex items-center justify-between outline-none transition focus:border-slate-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
            open ? "border-slate-400" : ""
          }`}
          style={{ outline: "none", boxShadow: "none" }}
        >
          <span
            className={`truncate ${
              value ? "text-slate-900 font-medium" : "text-slate-400"
            }`}
          >
            {value || displayPlaceholder}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${
              open ? "transform rotate-180 text-slate-600" : ""
            }`}
          />
        </button>

        {open && !readOnly && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2.5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-300 px-2.5 py-1.5 focus-within:border-slate-400 transition">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder={`Search or add new ${label.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (searchQuery.trim() && !exactMatchExists) {
                        handleAdd(e);
                      }
                    }
                  }}
                  className="w-full text-xs text-slate-800 placeholder-slate-400 outline-none focus:outline-none focus:ring-0 border-0 ring-0 bg-transparent"
                  style={{ outline: "none", boxShadow: "none" }}
                />
                {searchQuery.trim() && !exactMatchExists && (
                  <button
                    type="button"
                    onClick={(e) => handleAdd(e)}
                    disabled={loadingAction}
                    className="shrink-0 bg-[#083262] hover:bg-[#052243] text-white px-2 py-0.5 rounded text-xs font-semibold transition"
                  >
                    + Add
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
              {value ? (
                <div
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer transition"
                >
                  <span className="italic">-- Clear selection --</span>
                </div>
              ) : null}

              {!hasCurrentValueInOptions && value && (
                <div
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold bg-[#083262]/5 text-[#083262] border border-[#083262]/20 cursor-pointer"
                >
                  <span className="truncate">{value} (Current)</span>
                  <Check className="w-4 h-4 text-[#083262]" />
                </div>
              )}

              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400">
                  {searchQuery.trim() ? (
                    <div>
                      No matching option.
                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={(e) => handleAdd(e)}
                          className="font-bold text-[#083262] hover:underline"
                        >
                          Add &quot;{searchQuery.trim()}&quot; as new {label}
                        </button>
                      </div>
                    </div>
                  ) : (
                    "No options available. Type above to create one."
                  )}
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const optId = typeof opt === "object" ? opt.id : opt;
                  const optVal =
                    typeof opt === "object" ? opt.option_value : opt;
                  const isSelected = String(value) === String(optVal);
                  const isEditing = editingId === optId;

                  if (isEditing) {
                    return (
                      <div
                        key={optId}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs"
                      >
                        <input
                          autoFocus
                          type="text"
                          value={editingVal}
                          onChange={(e) => setEditingVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleUpdate(e, optId);
                            } else if (e.key === "Escape") {
                              setEditingId(null);
                            }
                          }}
                          className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-800 outline-none focus:outline-none focus:ring-0 bg-white focus:border-slate-500"
                          style={{ outline: "none", boxShadow: "none" }}
                        />
                        <button
                          type="button"
                          disabled={loadingAction || !editingVal.trim()}
                          onClick={(e) => handleUpdate(e, optId)}
                          className="text-emerald-700 font-bold hover:underline px-1 py-0.5 text-xs"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(null);
                            setEditingVal("");
                          }}
                          className="text-slate-400 hover:text-slate-600 px-1 py-0.5 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={optId}
                      onClick={() => {
                        onChange(optVal);
                        setOpen(false);
                      }}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition ${
                        isSelected
                          ? "bg-[#083262]/10 text-[#083262] font-semibold"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[#083262] shrink-0" />
                        )}
                        <span className="truncate">{optVal}</span>
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                        <button
                          type="button"
                          title="Edit option name"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(optId);
                            setEditingVal(optVal);
                          }}
                          className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-[#083262] transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Delete option"
                          onClick={(e) => handleDelete(e, optId, optVal)}
                          className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>{options.length} options</span>
              <span>Press Esc to close</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
