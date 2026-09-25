import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  SlidersHorizontal,
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  adminGetDirectory,
  adminSetDirectoryRecruiter,
  adminGetRecruiterOptions,
  adminAddRecruiterOption,
  adminUpdateRecruiterOption,
  adminDeleteRecruiterOption,
} from "../../../api/jobScreeningAdminApi";

const LIMIT = 25;

const SORT_CHOICES = [
  { value: "updated:desc", label: "Recently updated" },
  { value: "created:desc", label: "Newest first" },
  { value: "created:asc", label: "Oldest first" },
  { value: "name:asc", label: "Name A → Z" },
  { value: "name:desc", label: "Name Z → A" },
  { value: "age:asc", label: "Age: youngest" },
  { value: "age:desc", label: "Age: oldest" },
  { value: "experience:asc", label: "Experience A → Z" },
  { value: "score:desc", label: "Score: high → low" },
  { value: "score:asc", label: "Score: low → high" },
  { value: "recruiter:asc", label: "Recruiter A → Z" },
];

const labelCls =
  "text-[9px] font-bold uppercase tracking-wider text-slate-400";

const AVATAR_TONES = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
];
const avatarTone = (key) => {
  let h = 0;
  for (const c of String(key || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
};
const initials = (name) =>
  String(name || "").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "–";

const certDisplay = (r) => {
  const lvl = String(r.language_level || "").toUpperCase().trim();
  if (!lvl) return { text: "—", tone: "text-slate-300", dot: "bg-slate-300" };
  return {
    text: `${lvl} Completed`,
    tone: "text-emerald-700",
    dot: "bg-emerald-500",
  };
};

const maskEmail = (email) => {
  const [local, domain] = String(email || "").split("@");
  if (!domain) return "••••••";
  return `${local[0] || "•"}••••@${domain}`;
};

const scoreTone = (s) =>
  s >= 7
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : s >= 4
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : "bg-rose-50 text-rose-600 ring-rose-200";

const useDismiss = (open, onClose) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) onClose();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
};

// Shared custom dropdown. `multi` renders checkboxes and returns an array;
// otherwise single-select with an "All" reset row.
const FilterDropdown = ({
  label,
  value,
  values,
  onChange,
  options,
  placeholder = "All",
  multi = false,
  allowEmpty = true,
  width = "w-36",
}) => {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const selected = multi ? values || [] : null;
  const active = multi ? selected.length > 0 : !!value;

  const toggleValue = (v) => {
    if (!multi) {
      onChange(v === value && allowEmpty ? "" : v);
      setOpen(false);
      return;
    }
    onChange(
      selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v],
    );
  };

  const summary = multi
    ? selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selected`
    : options.find((o) => o.value === value)?.label || placeholder;

  return (
    <label className="flex flex-col gap-1">
      {label && <span className={labelCls}>{label}</span>}
      <span ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex h-9 ${width} cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 text-xs font-semibold transition ${
            active
              ? "border-[#083262]/50 bg-blue-50/60 text-[#083262]"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
        {open && (
          <span className="absolute left-0 top-[calc(100%+4px)] z-40 block w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
            <span className="block max-h-56 overflow-y-auto p-1">
              {!multi && allowEmpty && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold ${
                    !value ? "bg-blue-50 text-[#083262]" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                      !value ? "border-[#083262] bg-[#083262] text-white" : "border-slate-300 bg-white"
                    }`}
                  >
                    {!value && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{placeholder}</span>
                </button>
              )}
              {multi && selected.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-rose-500 hover:bg-rose-50"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
              {options.map((o) => {
                const on = multi ? selected.includes(o.value) : value === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggleValue(o.value)}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold ${
                      on ? "bg-blue-50 text-[#083262]" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                        on ? "border-[#083262] bg-[#083262] text-white" : "border-slate-300 bg-white"
                      }`}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate">{o.label}</span>
                  </button>
                );
              })}
              {options.length === 0 && (
                <span className="block px-2.5 py-2 text-xs text-slate-400">
                  No options
                </span>
              )}
            </span>
          </span>
        )}
      </span>
    </label>
  );
};

// Compact fixed-width recruiter picker. Popover is position:fixed so the
// scrollable table can't clip it; closes on scroll/outside click/Escape.
const RecruiterCell = ({ value, options, disabled, masked, onSelect, onAdd, onEditOption, onDeleteOption }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const triggerRef = useRef(null);
  const popRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (
        !triggerRef.current?.contains(e.target) &&
        !popRef.current?.contains(e.target)
      )
        setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  // Closing mid-edit drops the inline edit state
  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setEditText("");
    }
  }, [open]);

  const openMenu = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const flipUp = r.bottom + 270 > window.innerHeight;
      setPos({
        top: flipUp ? Math.max(8, r.top - 270) : r.bottom + 4,
        left: Math.max(8, r.right - 208),
      });
      setQ("");
    }
    setOpen((v) => !v);
  };

  const filtered = options.filter((o) =>
    o.option_value.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const trimmed = q.trim();
  const exact = options.some(
    (o) => o.option_value.toLowerCase() === trimmed.toLowerCase(),
  );

  const pick = async (val) => {
    if (busy) return;
    setBusy(true);
    await onSelect(val);
    setBusy(false);
    setOpen(false);
  };

  const add = async () => {
    if (busy || !trimmed || exact) return;
    setBusy(true);
    const ok = await onAdd(trimmed);
    setBusy(false);
    if (ok) setOpen(false);
  };

  const saveEdit = async (o) => {
    const v = editText.trim();
    if (!v || v === o.option_value) {
      setEditingId(null);
      return;
    }
    setBusy(true);
    const ok = await onEditOption(o.id, v);
    setBusy(false);
    if (ok) setEditingId(null);
  };

  return (
    <span className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || busy}
        onClick={openMenu}
        className={`inline-flex h-8 w-36 items-center justify-between gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition ${
          value
            ? "border-slate-200 bg-white text-slate-700 hover:border-[#083262]/40"
            : "border-dashed border-slate-300 bg-transparent text-slate-400 hover:border-[#083262]/40 hover:text-[#083262]"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <span className="truncate">{masked && value ? "••••••" : value || "Assign"}</span>
        )}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
      </button>

      {open && (
        <span
          ref={popRef}
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-50 block w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
        >
          <span className="block border-b border-slate-100 p-1.5">
            <input
              autoFocus
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Search or add recruiter..."
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-[#083262]"
            />
          </span>
          <span className="block max-h-44 overflow-y-auto p-1">
            {value && (
              <button
                type="button"
                onClick={() => pick(null)}
                className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-rose-500 hover:bg-rose-50"
              >
                <X className="h-3 w-3" /> Unassign
              </button>
            )}
            {filtered.map((o) =>
              editingId === o.id ? (
                <span key={o.id} className="block p-1">
                  <input
                    autoFocus
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(o);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    disabled={busy}
                    className="h-8 w-full rounded-lg border border-[#083262]/50 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#083262]/10"
                  />
                </span>
              ) : (
                <span
                  key={o.id}
                  className={`group flex w-full items-center rounded-lg px-2.5 py-2 text-xs font-semibold ${
                    value === o.option_value
                      ? "bg-blue-50 text-[#083262]"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => pick(o.option_value)}
                    className="flex flex-1 cursor-pointer items-center gap-2 truncate text-left"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                        value === o.option_value
                          ? "border-[#083262] bg-[#083262] text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {value === o.option_value && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate">{o.option_value}</span>
                  </button>
                  <button
                    type="button"
                    title="Rename option"
                    onClick={() => {
                      setEditingId(o.id);
                      setEditText(o.option_value);
                    }}
                    className="hidden shrink-0 cursor-pointer rounded p-0.5 text-slate-300 hover:bg-blue-50 hover:text-[#083262] group-hover:block"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    title="Remove option"
                    onClick={() => onDeleteOption(o.id, o.option_value)}
                    className="hidden shrink-0 cursor-pointer rounded p-0.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 group-hover:block"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ),
            )}
            {filtered.length === 0 && !trimmed && (
              <span className="block px-2.5 py-2 text-xs text-slate-400">
                No recruiters yet
              </span>
            )}
            {trimmed && !exact && (
              <button
                type="button"
                onClick={add}
                className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-[#083262] hover:bg-blue-50"
              >
                <Plus className="h-3 w-3" /> Add “{trimmed}”
              </button>
            )}
          </span>
        </span>
      )}
    </span>
  );
};

const DirectoryView = ({ canEdit, onOpenCandidate, fieldOptions, refreshKey, onLoadingChange, summary }) => {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortVal, setSortVal] = useState("updated:desc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    level: "",
    cert_status: "",
    paid: "",
    departments: [],
    qualification: "",
    experience: "",
    recruiter: "",
    min_score: "",
  });
  const [recruiterOptions, setRecruiterOptions] = useState([]);
  const [maskPII, setMaskPII] = useState(false);
  const reqRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadRecruiterOptions = async () => {
    try {
      const res = await adminGetRecruiterOptions();
      setRecruiterOptions(res.data?.data || []);
    } catch {
      /* options are non-critical */
    }
  };
  useEffect(() => {
    loadRecruiterOptions();
  }, []);

  const [sort, dir] = sortVal.split(":");

  const fetchRows = async () => {
    const id = ++reqRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetDirectory({
        page: pagination.page,
        limit: LIMIT,
        search: search || undefined,
        sort,
        dir,
        ...Object.fromEntries(
          Object.entries(filters).filter(
            ([k, v]) =>
              k !== "departments" && (Array.isArray(v) ? v.length > 0 : v !== ""),
          ),
        ),
        // JSON-encoded like the candidates list — departments[] keys get
        // flattened inconsistently by the query parser.
        departments: filters.departments.length
          ? JSON.stringify(filters.departments)
          : undefined,
      });
      if (id !== reqRef.current) return;
      setRows(res.data?.data || []);
      setPagination((p) => ({
        ...p,
        total: res.data?.pagination?.total || 0,
        totalPages: res.data?.pagination?.totalPages || 1,
      }));
    } catch (e) {
      if (id !== reqRef.current) return;
      setError(e.response?.data?.message || "Failed to load directory");
      setRows([]);
    } finally {
      if (id === reqRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, search, sortVal, filters]);

  // Header "Refresh List" button drives this via refreshKey
  useEffect(() => {
    if (refreshKey > 0) {
      fetchRows();
      loadRecruiterOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  const setFilter = (key, v) => {
    setFilters((f) => ({ ...f, [key]: v }));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const activeFilterCount = Object.values(filters).filter((v) =>
    Array.isArray(v) ? v.length > 0 : Boolean(v),
  ).length;
  const clearFilters = () => {
    setFilters({
      level: "", cert_status: "", paid: "", departments: [],
      qualification: "", experience: "", recruiter: "", min_score: "",
    });
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const assignRecruiter = async (userId, recruiter) => {
    const prev = rows.find((r) => r.user_id === userId)?.assigned_recruiter;
    setRows((rs) =>
      rs.map((r) => (r.user_id === userId ? { ...r, assigned_recruiter: recruiter } : r)),
    );
    try {
      await adminSetDirectoryRecruiter(userId, recruiter || "");
    } catch (e) {
      setRows((rs) =>
        rs.map((r) => (r.user_id === userId ? { ...r, assigned_recruiter: prev } : r)),
      );
      toast.error(e.response?.data?.message || "Failed to assign recruiter");
    }
  };

  const addRecruiterOption = async (name) => {
    try {
      const res = await adminAddRecruiterOption(name);
      const opt = res.data?.data;
      if (opt && !recruiterOptions.some((o) => o.id === opt.id))
        setRecruiterOptions((os) => [...os, opt]);
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to add recruiter");
      return false;
    }
  };

  const editRecruiterOption = async (id, newValue) => {
    const old = recruiterOptions.find((o) => o.id === id);
    try {
      await adminUpdateRecruiterOption(id, newValue);
      setRecruiterOptions((os) =>
        os.map((o) => (o.id === id ? { ...o, option_value: newValue } : o)),
      );
      if (old) {
        setRows((rs) =>
          rs.map((r) =>
            r.assigned_recruiter === old.option_value
              ? { ...r, assigned_recruiter: newValue }
              : r,
          ),
        );
      }
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to rename recruiter");
      return false;
    }
  };

  const deleteRecruiterOption = async (id, optionValue) => {
    try {
      await adminDeleteRecruiterOption(id);
      setRecruiterOptions((os) => os.filter((o) => o.id !== id));
      setRows((rs) =>
        rs.map((r) =>
          r.assigned_recruiter === optionValue
            ? { ...r, assigned_recruiter: null }
            : r,
        ),
      );
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to remove option");
    }
  };

  const deptOptions = (fieldOptions?.specialization || []).map((d) => ({
    value: d,
    label: d,
  }));
  const qualOptions = (fieldOptions?.qualification || []).map((q) => ({
    value: q,
    label: q,
  }));
  const expOptions = (fieldOptions?.experience || []).map((x) => ({
    value: x,
    label: x,
  }));
  const recruiterFilterOptions = [
    { value: "none", label: "Unassigned" },
    ...recruiterOptions.map((o) => ({ value: o.option_value, label: o.option_value })),
  ];

  const statCards = summary
    ? [
        { label: "Total Users", value: summary.total_users, tone: "border-slate-200 bg-white text-slate-900" },
        { label: "Referred", value: summary.referred, tone: "border-orange-200 bg-orange-50 text-orange-900" },
        { label: "Initiated", value: summary.initiated, tone: "border-purple-200 bg-purple-50 text-purple-900" },
        { label: "Profile Updated", value: summary.profile_updated, tone: "border-cyan-200 bg-cyan-50 text-cyan-900" },
        { label: "Interview Completed", value: summary.interview_completed, tone: "border-blue-200 bg-blue-50 text-blue-900" },
        { label: "Actions Pending", value: summary.actions_pending, tone: "border-amber-200 bg-amber-50 text-amber-900" },
        { label: "Active Candidates", value: summary.active_candidates, tone: "border-emerald-200 bg-emerald-50 text-emerald-900" },
        { label: "Inactive Candidates", value: summary.inactive_candidates, tone: "border-rose-200 bg-rose-50 text-rose-900" },
      ]
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {statCards && (
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
          {statCards.map((item) => (
            <div
              key={item.label}
              className={`flex min-w-0 flex-col justify-between rounded-xl border px-3 py-2.5 text-left shadow-sm ${item.tone}`}
            >
              <span className="min-h-6 text-[9px] font-semibold uppercase leading-3 tracking-wide opacity-80">
                {item.label}
              </span>
              <span className="mt-1 block text-lg font-bold leading-none tabular-nums">
                {Number(item.value) || 0}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/80 p-3.5">
        <div className="flex flex-wrap items-end gap-2.5">
          <div className="relative min-w-60 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-700 placeholder-slate-400 shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#083262]"
            />
          </div>

          <FilterDropdown
            label="Sort By"
            value={sortVal}
            onChange={(v) => {
              setSortVal(v || "updated:desc");
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            options={SORT_CHOICES}
            placeholder="Recently updated"
            allowEmpty={false}
            width="w-40"
          />

          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3.5 text-xs font-bold transition ${
              filtersOpen || activeFilterCount > 0
                ? "border-[#083262] bg-[#083262] text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-extrabold text-[#083262]">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-9 cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              Clear
            </button>
          )}

          <button
            type="button"
            onClick={() => setMaskPII((v) => !v)}
            title={maskPII ? "Show emails & recruiters" : "Mask emails & recruiters"}
            className={`ml-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border transition ${
              maskPII
                ? "border-[#083262] bg-[#083262] text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
            }`}
          >
            {maskPII ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {filtersOpen && (
          <div className="mt-3 flex flex-wrap items-end gap-2.5 rounded-xl border border-slate-200/80 bg-white/80 p-3">
            <FilterDropdown
              label="Language Level"
              value={filters.level}
              onChange={(v) => setFilter("level", v)}
              placeholder="All levels"
              options={[
                { value: "B1", label: "B1" },
                { value: "B2", label: "B2" },
              ]}
              width="w-32"
            />
            <FilterDropdown
              label="Certificate"
              value={filters.cert_status}
              onChange={(v) => setFilter("cert_status", v)}
              placeholder="All statuses"
              options={[
                { value: "completed", label: "Completed" },
                { value: "in_progress", label: "In progress" },
                { value: "rejected", label: "Rejected" },
              ]}
              width="w-36"
            />
            <FilterDropdown
              label="Payment"
              value={filters.paid}
              onChange={(v) => setFilter("paid", v)}
              options={[
                { value: "paid", label: "Paid" },
                { value: "unpaid", label: "Unpaid" },
              ]}
              width="w-28"
            />
            <FilterDropdown
              label="Departments"
              multi
              values={filters.departments}
              onChange={(v) => setFilter("departments", v)}
              options={deptOptions}
              placeholder="All departments"
              width="w-40"
            />
            <FilterDropdown
              label="Qualification"
              value={filters.qualification}
              onChange={(v) => setFilter("qualification", v)}
              options={qualOptions}
              placeholder="All"
              width="w-40"
            />
            <FilterDropdown
              label="Experience"
              value={filters.experience}
              onChange={(v) => setFilter("experience", v)}
              options={expOptions}
              placeholder="All"
              width="w-32"
            />
            <FilterDropdown
              label="Recruiter"
              value={filters.recruiter}
              onChange={(v) => setFilter("recruiter", v)}
              options={recruiterFilterOptions}
              placeholder="All"
              width="w-36"
            />
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Min Score</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={filters.min_score}
                onChange={(e) => setFilter("min_score", e.target.value)}
                placeholder="e.g. 6"
                className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 outline-none transition focus:border-[#083262] focus:ring-2 focus:ring-[#083262]/10"
              />
            </label>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200/60 bg-white shadow-sm">
        <table className="w-full min-w-[1120px] border-collapse text-left">
          <thead className="sticky top-0 z-10">
            <tr className="border-b-2 border-slate-200 bg-[#083262]">
              {["Candidate", "Age", "Experience", "Departments", "Qualification", "Language Cert", "Score", "Paid", "Recruiter"].map(
                (h, i) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-100/80 ${i === 0 ? "pl-5" : ""} ${h === "Paid" ? "text-center" : ""}`}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-3.5 w-4/5 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <p className="text-sm font-semibold text-slate-500">{error}</p>
                  <button
                    type="button"
                    onClick={fetchRows}
                    className="mt-3 cursor-pointer rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:border-[#083262] hover:text-[#083262]"
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <Users className="mx-auto h-9 w-9 text-slate-200" />
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    No candidates match the current filters
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => {
                const cert = certDisplay(r);
                const depts = Array.isArray(r.departments) ? r.departments : [];
                return (
                  <tr
                    key={r.user_id}
                    onClick={() => onOpenCandidate(r.user_id)}
                    className={`cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50/60 ${
                      idx % 2 === 1 ? "bg-slate-50/40" : ""
                    }`}
                  >
                    <td className="px-4 py-3 pl-5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${avatarTone(r.fullname || r.email)}`}
                        >
                          {initials(r.fullname)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-slate-800">
                            {r.fullname || "—"}
                          </div>
                          <div className="truncate text-[10px] font-medium text-slate-400">
                            {maskPII ? maskEmail(r.email) : r.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                      {r.age ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                      {r.experience || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {depts.length ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {depts.slice(0, 2).map((d) => (
                            <span
                              key={d}
                              className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-inset ring-indigo-100"
                            >
                              {d}
                            </span>
                          ))}
                          {depts.length > 2 && (
                            <span
                              title={depts.slice(2).join(", ")}
                              className="text-[10px] font-bold text-slate-400"
                            >
                              +{depts.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                      {r.qualification || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold ${cert.tone}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cert.dot}`} />
                        {cert.text}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.score !== null && r.score !== undefined ? (
                        <span
                          className={`inline-flex h-6 min-w-10 items-center justify-center rounded-lg px-2 text-xs font-extrabold ring-1 ring-inset ${scoreTone(r.score)}`}
                        >
                          {r.score}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ring-1 ring-inset ${
                          r.is_paid
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-amber-50 text-amber-600 ring-amber-200"
                        }`}
                      >
                        {r.is_paid ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <RecruiterCell
                        value={r.assigned_recruiter}
                        options={recruiterOptions}
                        disabled={!canEdit}
                        masked={maskPII}
                        onSelect={(val) => assignRecruiter(r.user_id, val)}
                        onAdd={async (name) => {
                          const ok = await addRecruiterOption(name);
                          if (ok) await assignRecruiter(r.user_id, name);
                          return ok;
                        }}
                        onEditOption={editRecruiterOption}
                        onDeleteOption={deleteRecruiterOption}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-slate-400">
          {pagination.total} candidate{pagination.total === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition enabled:hover:border-[#083262] enabled:hover:text-[#083262] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold text-slate-500">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition enabled:hover:border-[#083262] enabled:hover:text-[#083262] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DirectoryView;
