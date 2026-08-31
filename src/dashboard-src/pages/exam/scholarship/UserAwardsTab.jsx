import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Plus, Trash2, Loader2, UserPlus, Save, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import * as api from "../../../../api/scholarshipExamApi";
import useDebounce from "../../../../hooks/useDebounce";
import { btn, inputCls, labelCls } from "./ui/buttons";
import ConfirmDialog from "./ui/ConfirmDialog";

const PAGE_SIZE = 25;

export default function UserAwardsTab() {
  const [awards, setAwards] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pct, setPct] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const wrapperRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const activeSearchRef = useRef("");

  const fetchAwards = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.listUserAwards({
        q: debouncedSearch.trim() || undefined,
        page: p,
        limit: PAGE_SIZE,
      });
      setAwards(res.data?.awards || []);
      setCount(res.data?.count || 0);
      setPage(res.data?.page || p);
    } catch {
      toast.error("Failed to load awards");
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [debouncedSearch]);

  // Debounced term, not the raw one: refetching per keystroke costs an
  // unindexed LIKE '%q%' plus a COUNT(*) per character.
  useEffect(() => { fetchAwards(1); }, [fetchAwards]);

  // Click outside to close user dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const handleUserSearchChange = (val) => {
    setUserSearch(val);
    // typing clears the previously picked user so Save can't award the wrong one
    if (selectedUser) setSelectedUser(null);

    const trimmed = val.trim();
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    activeSearchRef.current = trimmed;

    if (trimmed.length === 0) {
      setUserResults([]);
      setShowDropdown(false);
      setQueryLoading(false);
      return;
    }
    if (trimmed.length < 2) {
      setUserResults([]);
      setShowDropdown(false);
      setQueryLoading(false);
      return;
    }
    setShowDropdown(true);
    setQueryLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.searchUsersForAward(trimmed);
        if (activeSearchRef.current === trimmed) {
          setUserResults(res.data?.users || []);
        }
      } catch {
        if (activeSearchRef.current === trimmed) setUserResults([]);
      } finally {
        if (activeSearchRef.current === trimmed) setQueryLoading(false);
      }
    }, 300);
  };

  const handleUserFocus = () => {
    if (userSearch.trim().length >= 2) setShowDropdown(true);
  };

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    setUserSearch(u.fullname || u.username || u.user_id);
    setShowDropdown(false);
  };

  const handleCreate = async () => {
    if (!selectedUser) { toast.error("Pick a user first"); return; }
    const n = Number(pct);
    if (pct === "" || !Number.isInteger(n) || n < 0 || n > 100) {
      toast.error("Scholarship % must be an integer 0–100"); return;
    }
    setSaving(true);
    try {
      await api.createUserAward({ user_id: selectedUser.user_id, scholarship_pct: n, reason: reason.trim() || undefined });
      toast.success("Award created");
      setSelectedUser(null); setPct(""); setReason(""); setUserResults([]); setUserSearch("");
      await fetchAwards();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to create award");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (award, newPct, newReason) => {
    const n = Number(newPct);
    if (!Number.isInteger(n) || n < 0 || n > 100) { toast.error("Scholarship % must be 0–100 integer"); return; }
    try {
      await api.updateUserAward(award.id, { scholarship_pct: n, reason: newReason });
      toast.success("Award updated");
      await fetchAwards(page);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to update");
    }
  };

  // Revoking is permanent (the row stays as history but stops counting), and the
  // reason lands in the audit trail — so ask for it instead of stamping every
  // revocation with the same placeholder.
  const handleRevoke = (award) => {
    setConfirm({
      title: "Revoke this award?",
      subtitle: award.fullname || award.username || award.user_id,
      message: `${award.scholarship_pct}% will stop applying immediately. The row is kept as history and cannot be un-revoked — create a new award instead.`,
      confirmLabel: "Revoke award",
      danger: true,
      promptLabel: "Reason (recorded in the activity log)",
      promptPlaceholder: "e.g. duplicate award, no longer eligible",
      action: async (revokeReason) => {
        try {
          await api.revokeUserAward(award.id, { revoke_reason: revokeReason?.trim() || undefined });
          toast.success("Award revoked");
          await fetchAwards(page);
        } catch (err) {
          toast.error(err.response?.data?.msg || "Failed to revoke");
        }
      },
    });
  };

  // Only the very first paint blocks: a spinner that replaces the whole tab on
  // every refetch unmounts the filter input and throws away keyboard focus.
  if (firstLoad && loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#002856]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Create */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 rounded-lg bg-[#eef2f6] flex items-center justify-center text-[#002856]">
            <UserPlus className="w-4 h-4" />
          </span>
          <h3 className="text-sm font-bold text-slate-700">Per-user scholarship</h3>
          <span className="text-xs text-slate-400">— global override, always wins over tier</span>
        </div>

        {/* The award is global, but the candidate only ever sees it on a released
            result — there is no other screen that reads it. */}
        <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          Applies to every exam (not tied to one), and overrides whatever the tiers awarded.
          The candidate sees it on their result page only once that exam&apos;s results are
          released — until then the award exists but is invisible to them.
        </p>

        <div className="space-y-3">
          <div ref={wrapperRef} className="relative">
            <label className={labelCls}>Search user (name, username, phone, user_id — min 2 chars)</label>
            <div className="relative">
              <input
                data-testid="award-user-search"
                value={userSearch}
                onChange={(e) => handleUserSearchChange(e.target.value)}
                onFocus={handleUserFocus}
                placeholder="e.g. yash, 98765, user_123"
                className={`${inputCls} pr-9`}
                autoComplete="off"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                {queryLoading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              </span>
            </div>

            {/* Instant searchable dropdown — same pattern as payments-admin CreatePaymentLinkModal */}
            {showDropdown && userSearch.trim().length >= 2 && (
              <div className="absolute top-full mt-2 z-50 w-full rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg max-h-48 overflow-y-auto animate-fade">
                {queryLoading ? (
                  <div className="px-3 py-2 text-xs text-slate-400 flex items-center gap-1.5 justify-center">
                    <RefreshCw size={12} className="animate-spin" />
                    Searching...
                  </div>
                ) : userResults.length > 0 ? (
                  userResults.map((u) => (
                    <button
                      key={u.user_id}
                      type="button"
                      data-testid="award-user-result"
                      onClick={() => handleSelectUser(u)}
                      className={`block w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-50 text-slate-700 transition ${selectedUser?.user_id === u.user_id ? "bg-[#eef2f6]" : ""}`}
                    >
                      <div className="font-semibold text-slate-800">{u.fullname || u.username}</div>
                      <div className="text-slate-400 mt-0.5">
                        @{u.username} · {u.number || "—"} · {u.user_id} {u.role ? `· ${u.role}` : ""}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-slate-400 text-center">No users found</div>
                )}
              </div>
            )}
          </div>

          {selectedUser && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#eef2f6] border border-[#dbeafe]">
              <span className="text-sm font-semibold text-[#002856]" data-testid="award-selected-user">
                {selectedUser.fullname || selectedUser.username} (@{selectedUser.username}) · {selectedUser.user_id}
              </span>
              <button onClick={() => setSelectedUser(null)} className="ml-auto text-xs text-slate-500 hover:text-slate-700">Clear</button>
            </div>
          )}

          <div className="flex gap-3">
            <div className="w-36">
              <label className={labelCls}>Scholarship %</label>
              <input data-testid="award-pct-input" type="number" min={0} max={100} step={1} value={pct} onChange={(e) => setPct(e.target.value)} placeholder="e.g. 25" className={inputCls} />
            </div>
            <div className="flex-1">
              <label className={labelCls}>Internal note (optional — admins only)</label>
              <input data-testid="award-reason-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. approved by director, offline drive" className={inputCls} />
            </div>
            <div className="flex items-end">
              <button data-testid="award-create-btn" onClick={handleCreate} disabled={saving || !selectedUser} className={`${btn.primary} ${!selectedUser ? "opacity-40 cursor-not-allowed" : ""}`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Save award
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-3 flex items-center gap-2.5">
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          data-testid="award-filter"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter awards by name / username / phone"
          className="flex-1 text-sm bg-transparent border-0 outline-none focus:ring-0 placeholder:text-slate-400"
        />
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 shrink-0" />}
        <span className="text-xs text-slate-400 shrink-0">{count} active</span>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-6">
        <h4 className="text-sm font-bold text-slate-700 mb-3">Active awards</h4>
        {awards.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8" data-testid="award-empty">
            {debouncedSearch.trim() ? "No awards match this filter." : "No active per-user awards."}
          </p>
        ) : (
          <div className="space-y-2">
            {awards.map((a) => (
              // Keyed on updated_at too: after a save the row must re-seed its
              // inputs from the refetched award, not keep the stale local copy.
              <AwardRow key={`${a.id}-${a.updated_at || ""}`} award={a} onUpdate={handleUpdate} onRevoke={handleRevoke} />
            ))}
          </div>
        )}

        {count > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-slate-400">Page {page} — {count} total</span>
            <div className="flex gap-2">
              <button data-testid="award-prev" disabled={page <= 1 || loading} onClick={() => fetchAwards(page - 1)} className={`${btn.secondary} ${page <= 1 ? "opacity-40 cursor-not-allowed" : ""}`}>Prev</button>
              <button data-testid="award-next" disabled={page * PAGE_SIZE >= count || loading} onClick={() => fetchAwards(page + 1)} className={`${btn.secondary} ${page * PAGE_SIZE >= count ? "opacity-40 cursor-not-allowed" : ""}`}>Next</button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog confirm={confirm} onCancel={() => setConfirm(null)} />
    </div>
  );
}

function AwardRow({ award, onUpdate, onRevoke }) {
  const [pct, setPct] = useState(String(award.scholarship_pct));
  const [reason, setReason] = useState(award.reason || "");
  const [saving, setSaving] = useState(false);
  const dirty = Number(pct) !== Number(award.scholarship_pct) || (reason || "") !== (award.reason || "");
  const handleSave = async () => {
    setSaving(true);
    await onUpdate(award, pct, reason.trim() || null);
    setSaving(false);
  };
  return (
    <div data-testid="award-row" className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{award.fullname || award.username} <span className="font-normal text-slate-400">@{award.username} · {award.number || "—"}</span></p>
        <p className="text-xs text-slate-400 truncate">{award.user_id} {award.reason ? `· ${award.reason}` : ""}</p>
      </div>
      <input data-testid="award-row-pct" type="number" min={0} max={100} step={1} value={pct} onChange={(e) => setPct(e.target.value)} className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
      <span className="text-xs text-slate-400">%</span>
      <input data-testid="award-row-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="reason" className="w-36 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
      <button data-testid="award-row-save" onClick={handleSave} disabled={!dirty || saving} className={`${btn.secondary} !px-2 !py-1 text-xs ${!dirty ? "opacity-40" : ""}`}>
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
        Save
      </button>
      <button data-testid="award-revoke-btn" onClick={() => onRevoke(award)} className={`${btn.dangerGhost} !px-2 !py-1 text-xs`}>
        <Trash2 className="w-3 h-3" /> Revoke
      </button>
    </div>
  );
}
