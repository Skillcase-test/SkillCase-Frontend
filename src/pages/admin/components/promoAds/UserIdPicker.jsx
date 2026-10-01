import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { adminSearchUsers } from "../../../../api/promoAdAdminApi";

const inputCls =
  "h-9 px-3 w-full bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#083262]/50 placeholder:text-slate-300 disabled:opacity-50";

// Search-pick list of user ids; `entries` maps saved ids to name/phone labels.
const UserIdPicker = ({ values, onChange, canEdit, placeholder }) => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [entries, setEntries] = useState({}); // id -> {fullname, phone}
  const triedIds = useRef(new Set());
  const boxRef = useRef(null);
  const [open, setOpen] = useState(false);

  // Resolve labels for ids saved on the record (editing an existing ad).
  useEffect(() => {
    const missing = values.filter(
      (id) => !entries[id] && !triedIds.current.has(id),
    );
    if (!missing.length) return;
    missing.forEach((id) => triedIds.current.add(id));
    adminSearchUsers({ ids: missing.join(",") })
      .then((res) => {
        const found = res.data?.data || [];
        if (!found.length) return;
        setEntries((prev) => {
          const next = { ...prev };
          found.forEach((u) => {
            next[u.user_id] = { fullname: u.fullname, phone: u.phone };
          });
          return next;
        });
      })
      .catch(() => {});
  }, [values, entries]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      adminSearchUsers({ q: q.trim() })
        .then((res) => setResults(res.data?.data || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pick = (u) => {
    if (!values.includes(u.user_id)) {
      onChange([...values, u.user_id]);
      setEntries((prev) => ({
        ...prev,
        [u.user_id]: { fullname: u.fullname, phone: u.phone },
      }));
    }
    setQ("");
    setResults([]);
  };

  const remove = (id) => onChange(values.filter((v) => v !== id));

  return (
    <div ref={boxRef} className="relative flex flex-col gap-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((id) => {
            const meta = entries[id];
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-[10px] font-bold text-slate-600"
              >
                {meta?.fullname || meta?.phone || id}
                <span className="text-slate-400 font-medium">{meta?.fullname ? (meta.phone || id) : ""}</span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => remove(id)}
                    className="w-4 h-4 rounded-full hover:bg-slate-300/70 flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          className={`${inputCls} pl-8`}
          value={q}
          disabled={!canEdit}
          placeholder={placeholder || "Search name, phone or user id…"}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {searching && (
          <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
        )}
      </div>
      {open && (results.length > 0 || (q.trim().length >= 2 && !searching)) && (
        <div className="absolute top-full mt-1 left-0 right-0 z-30 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-[11px] font-medium text-slate-400">
              No users match “{q}”
            </p>
          ) : (
            results.map((u) => (
              <button
                key={u.user_id}
                type="button"
                onClick={() => pick(u)}
                disabled={values.includes(u.user_id)}
                className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-[11px] font-bold text-slate-700 truncate">
                    {u.fullname || "—"}
                  </span>
                  <span className="block text-[10px] font-medium text-slate-400 truncate">
                    {u.phone || u.user_id}
                  </span>
                </span>
                <span className="text-[9px] font-extrabold uppercase text-indigo-500">
                  {String(u.current_profeciency_level || "").toUpperCase()}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default UserIdPicker;
