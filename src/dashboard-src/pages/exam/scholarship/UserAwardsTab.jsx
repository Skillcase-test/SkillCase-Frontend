import { useEffect, useState, useCallback, useRef } from "react";
import {
  Search,
  Plus,
  Trash2,
  Loader2,
  UserPlus,
  Save,
  RefreshCw,
  Clock,
  CheckCircle2,
  Award,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import * as api from "../../../../api/scholarshipExamApi";
import useDebounce from "../../../../hooks/useDebounce";
import { toUTC, toLocalInput, formatDateTimeIST } from "../../../../utils/dateTime";
import { btn, inputCls, labelCls } from "./ui/buttons";
import { formatTimeLeft } from "./ui/timeLeft";
import ConfirmDialog from "./ui/ConfirmDialog";
import { useScholarshipWorkspace } from "./index";

const PAGE_SIZE = 25;

/**
 * datetime-local (IST) → UTC ISO, enforcing "now or later" the same way the
 * picker's min attribute does client-side. Returns { value } (null = clear /
 * fall back to the global window) or { error }. An already-saved deadline that
 * has since passed comes back flagged `unchanged` so editing % or note still
 * works — only newly picked dates must be in the future.
 */
function parseExpiryInput(raw, savedIso) {
  const trimmed = String(raw).trim();
  if (trimmed === "") return { value: null };
  let iso;
  try {
    iso = toUTC(trimmed);
  } catch {
    return { error: "Pick a valid date and time" };
  }
  const ms = new Date(iso).getTime();
  // datetime-local has minute resolution — compare at that resolution so a
  // value re-seeded from the server counts as untouched.
  const savedMs = savedIso ? new Date(savedIso).getTime() : null;
  const unchanged = savedMs != null && Number.isFinite(savedMs) &&
    Math.floor(ms / 60000) === Math.floor(savedMs / 60000);
  if (!unchanged && ms < Date.now()) {
    return { error: "Deadline must be now or later" };
  }
  return { value: iso, unchanged };
}

export default function UserAwardsTab() {
  const workspace = useScholarshipWorkspace?.();
  const selectedExam = workspace?.selectedExam;

  // Active view: "completed" (feed of completed candidates) vs "active" (active granted awards)
  const [activeTab, setActiveTab] = useState(selectedExam ? "completed" : "active");

  // ─── Active awards state ───────────────────────────────────────────────────
  const [awards, setAwards] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);

  // ─── Completed candidates state ────────────────────────────────────────────
  const [completedCandidates, setCompletedCandidates] = useState([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [completedPage, setCompletedPage] = useState(1);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [completedSearch, setCompletedSearch] = useState("");
  const debouncedCompletedSearch = useDebounce(completedSearch);
  const [pendingOnly, setPendingOnly] = useState(true);

  // ─── Manual user award search form state ───────────────────────────────────
  const [showManualForm, setShowManualForm] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pct, setPct] = useState("");
  const [expires, setExpires] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const wrapperRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const activeSearchRef = useRef("");

  // Recomputed on each render to prevent submitting a past timestamp
  const minExpiryInput = toLocalInput(new Date().toISOString());

  // ─── Load active awards ───────────────────────────────────────────────────
  const fetchAwards = useCallback(
    async (p = 1) => {
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
    },
    [debouncedSearch],
  );

  useEffect(() => {
    fetchAwards(1);
  }, [fetchAwards]);

  // ─── Load completed candidates for selected exam ───────────────────────────
  const fetchCompletedCandidates = useCallback(
    async (p = 1) => {
      if (!selectedExam?.test_id) return;
      setCompletedLoading(true);
      try {
        const res = await api.listCompletedCandidatesForAward(selectedExam.test_id, {
          q: debouncedCompletedSearch.trim() || undefined,
          page: p,
          limit: PAGE_SIZE,
          pending_only: pendingOnly ? "true" : "false",
        });
        setCompletedCandidates(res.data?.candidates || []);
        setCompletedCount(res.data?.count || 0);
        setPendingCount(res.data?.pending_count || 0);
        setCompletedPage(res.data?.page || p);
      } catch {
        toast.error("Failed to load completed candidates");
      } finally {
        setCompletedLoading(false);
      }
    },
    [selectedExam?.test_id, debouncedCompletedSearch, pendingOnly],
  );

  useEffect(() => {
    if (selectedExam?.test_id) {
      fetchCompletedCandidates(1);
    }
  }, [fetchCompletedCandidates, selectedExam?.test_id]);

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
    if (selectedUser) setSelectedUser(null);

    const trimmed = val.trim();
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    activeSearchRef.current = trimmed;

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
    // Display ONLY full name and phone number
    setUserSearch(u.fullname || u.number || "Selected Candidate");
    setShowDropdown(false);
  };

  const handleCreate = async () => {
    if (!selectedUser) {
      toast.error("Pick a user first");
      return;
    }
    const n = Number(pct);
    if (pct === "" || !Number.isInteger(n) || n < 0 || n > 100) {
      toast.error("Scholarship % must be an integer 0–100");
      return;
    }
    const parsedExpiry = parseExpiryInput(expires);
    if (parsedExpiry.error) {
      toast.error(parsedExpiry.error);
      return;
    }
    setSaving(true);
    try {
      await api.createUserAward({
        user_id: selectedUser.user_id,
        scholarship_pct: n,
        reason: reason.trim() || undefined,
        redemption_expires_at: parsedExpiry.value ?? undefined,
      });
      toast.success("Award created");
      setSelectedUser(null);
      setPct("");
      setExpires("");
      setReason("");
      setUserResults([]);
      setUserSearch("");
      setShowManualForm(false);
      await fetchAwards(1);
      if (selectedExam?.test_id) await fetchCompletedCandidates(completedPage);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to create award");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (award, newPct, newReason, newExpires) => {
    const n = Number(newPct);
    if (!Number.isInteger(n) || n < 0 || n > 100) {
      toast.error("Scholarship % must be 0–100 integer");
      return;
    }
    const parsedExpiry = parseExpiryInput(newExpires, award.redemption_expires_at);
    if (parsedExpiry.error) {
      toast.error(parsedExpiry.error);
      return;
    }
    try {
      await api.updateUserAward(award.id, {
        scholarship_pct: n,
        reason: newReason,
        ...(parsedExpiry.unchanged ? {} : { redemption_expires_at: parsedExpiry.value }),
      });
      toast.success("Award updated");
      await fetchAwards(page);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to update");
    }
  };

  const handleRevoke = (award) => {
    setConfirm({
      title: "Revoke this award?",
      subtitle: award.fullname || award.number || "Candidate",
      message: `${award.scholarship_pct}% will stop applying immediately. The row is kept as history and cannot be un-revoked — create a new award instead.`,
      confirmLabel: "Revoke award",
      danger: true,
      promptLabel: "Reason (recorded in the activity log)",
      promptPlaceholder: "e.g. duplicate award, no longer eligible",
      action: async (revokeReason) => {
        try {
          await api.revokeUserAward(award.id, {
            revoke_reason: revokeReason?.trim() || undefined,
          });
          toast.success("Award revoked");
          await fetchAwards(page);
          if (selectedExam?.test_id) await fetchCompletedCandidates(completedPage);
        } catch (err) {
          toast.error(err.response?.data?.msg || "Failed to revoke");
        }
      },
    });
  };

  const handleAwardGrantedFromCompleted = async () => {
    await fetchAwards(1);
    await fetchCompletedCandidates(completedPage);
  };

  if (firstLoad && loading && !selectedExam) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#002856]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Completed Candidates Feed (when exam is selected) ────────────── */}
      {selectedExam && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#002856]">
                <Users className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Completed Candidates (Latest First)
                </h3>
                <p className="text-xs text-slate-400">
                  Candidates who finished this exam. Grant scholarship % and redeem deadline directly.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={pendingOnly}
                  onChange={(e) => setPendingOnly(e.target.checked)}
                  className="rounded text-[#002856] focus:ring-0"
                />
                <span>Awaiting award only ({pendingCount})</span>
              </label>
            </div>
          </div>

          {/* Search bar */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-2.5 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              value={completedSearch}
              onChange={(e) => setCompletedSearch(e.target.value)}
              placeholder="Search completed candidates by full name or phone number..."
              className="flex-1 text-xs bg-transparent border-0 outline-none focus:ring-0 placeholder:text-slate-400"
            />
            {completedLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 shrink-0" />}
            <span className="text-xs text-slate-400 shrink-0">
              {completedCount} completed · {pendingCount} awaiting award
            </span>
          </div>

          {/* List of completed candidates */}
          {completedLoading && completedCandidates.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[#002856]" />
            </div>
          ) : completedCandidates.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              {debouncedCompletedSearch.trim()
                ? "No completed candidates match this search."
                : pendingOnly
                  ? "All completed candidates for this exam have been awarded!"
                  : "No completed submissions for this exam yet."}
            </p>
          ) : (
            <div className="space-y-3">
              {completedCandidates.map((c) => (
                <CompletedCandidateRow
                  key={c.submission_id}
                  candidate={c}
                  minExpiryInput={minExpiryInput}
                  onAwardGranted={handleAwardGrantedFromCompleted}
                />
              ))}
            </div>
          )}

          {completedCount > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                Page {completedPage} of {Math.ceil(completedCount / PAGE_SIZE)} ({completedCount} total)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={completedPage <= 1 || completedLoading}
                  onClick={() => fetchCompletedCandidates(completedPage - 1)}
                  className={`${btn.secondary} !py-1 !px-2.5 text-xs ${
                    completedPage <= 1 ? "opacity-40 cursor-not-allowed" : ""
                  }`}
                >
                  Prev
                </button>
                <button
                  disabled={completedPage * PAGE_SIZE >= completedCount || completedLoading}
                  onClick={() => fetchCompletedCandidates(completedPage + 1)}
                  className={`${btn.secondary} !py-1 !px-2.5 text-xs ${
                    completedPage * PAGE_SIZE >= completedCount ? "opacity-40 cursor-not-allowed" : ""
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Manual Per-User Scholarship Card ────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-8 h-8 rounded-lg bg-[#eef2f6] flex items-center justify-center text-[#002856]">
            <UserPlus className="w-4 h-4" />
          </span>
          <h3 className="text-sm font-bold text-slate-700">Per-user scholarship</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Overrides tiers and the global redemption window for this user. Search by full name or phone number.
        </p>

        <div className="space-y-3">
          <div ref={wrapperRef} className="relative">
            <label className={labelCls}>Search candidate</label>
            <div className="relative">
              <input
                data-testid="award-user-search"
                value={userSearch}
                onChange={(e) => handleUserSearchChange(e.target.value)}
                onFocus={handleUserFocus}
                placeholder="Full name or phone number..."
                className={`${inputCls} pr-9`}
                autoComplete="off"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                {queryLoading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              </span>
            </div>

            {/* Dropdown showing ONLY Full Name and Phone Number */}
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
                      className={`block w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-50 text-slate-700 transition ${
                        selectedUser?.user_id === u.user_id ? "bg-[#eef2f6]" : ""
                      }`}
                    >
                      <div className="font-semibold text-slate-800">
                        {u.fullname || "Unnamed User"}
                      </div>
                      <div className="text-slate-400 mt-0.5">
                        {u.number || "No phone"}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-slate-400 text-center">No users found</div>
                )}
              </div>
            )}
          </div>

          {/* Selected user pill - ONLY Full Name and Phone */}
          {selectedUser && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#eef2f6] border border-[#dbeafe]">
              <span className="text-sm font-semibold text-[#002856]" data-testid="award-selected-user">
                {selectedUser.fullname || "Unnamed User"}{" "}
                {selectedUser.number ? `· ${selectedUser.number}` : ""}
              </span>
              <button
                onClick={() => setSelectedUser(null)}
                className="ml-auto text-xs text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="w-28">
              <label className={labelCls}>Scholarship %</label>
              <input
                data-testid="award-pct-input"
                type="number"
                min={0}
                max={100}
                step={1}
                value={pct}
                onChange={(e) => setPct(e.target.value)}
                placeholder="e.g. 25"
                className={inputCls}
              />
            </div>
            <div className="w-56">
              <label className={labelCls}>Redeem until (IST)</label>
              <input
                data-testid="award-expires-input"
                type="datetime-local"
                min={minExpiryInput}
                value={expires}
                onChange={(e) => setExpires(e.target.value)}
                title="Redemption deadline for this user. Leave blank to use the exam's global window."
                className={inputCls}
              />
            </div>
            <div className="flex-1">
              <label className={labelCls}>Note (optional)</label>
              <input
                data-testid="award-reason-input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Internal note, admins only"
                className={inputCls}
              />
            </div>
            <button
              data-testid="award-create-btn"
              onClick={handleCreate}
              disabled={saving || !selectedUser}
              className={`${btn.primary} shrink-0 ${!selectedUser ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Save award
            </button>
          </div>
        </div>
      </div>

      {/* ─── Active Awards List ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Award className="w-4 h-4" />
            </span>
            <h4 className="text-sm font-bold text-slate-700">Active awards</h4>
          </div>
          <span className="text-xs text-slate-400">{count} active</span>
        </div>

        {/* Filter */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-2.5 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            data-testid="award-filter"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter active awards by full name or phone number..."
            className="flex-1 text-xs bg-transparent border-0 outline-none focus:ring-0 placeholder:text-slate-400"
          />
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 shrink-0" />}
          <span className="text-xs text-slate-400 shrink-0">{count} active</span>
        </div>

        {/* List */}
        {awards.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8" data-testid="award-empty">
            {debouncedSearch.trim() ? "No awards match this filter." : "No active per-user awards."}
          </p>
        ) : (
          <div className="space-y-2.5">
            {awards.map((a) => (
              <AwardRow
                key={`${a.id}-${a.updated_at || ""}`}
                award={a}
                onUpdate={handleUpdate}
                onRevoke={handleRevoke}
              />
            ))}
          </div>
        )}

        {count > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Page {page} — {count} total
            </span>
            <div className="flex gap-2">
              <button
                data-testid="award-prev"
                disabled={page <= 1 || loading}
                onClick={() => fetchAwards(page - 1)}
                className={`${btn.secondary} !py-1 !px-2.5 text-xs ${
                  page <= 1 ? "opacity-40 cursor-not-allowed" : ""
                }`}
              >
                Prev
              </button>
              <button
                data-testid="award-next"
                disabled={page * PAGE_SIZE >= count || loading}
                onClick={() => fetchAwards(page + 1)}
                className={`${btn.secondary} !py-1 !px-2.5 text-xs ${
                  page * PAGE_SIZE >= count ? "opacity-40 cursor-not-allowed" : ""
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog confirm={confirm} onCancel={() => setConfirm(null)} />
    </div>
  );
}

// ─── Completed Candidate Row ──────────────────────────────────────────────────

function CompletedCandidateRow({ candidate, minExpiryInput, onAwardGranted }) {
  const [pct, setPct] = useState("");
  const [expires, setExpires] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const addHours = (hours) => {
    const d = new Date(Date.now() + hours * 3600 * 1000);
    setExpires(toLocalInput(d.toISOString()));
  };

  const isAwarded = !!candidate.active_award_id;

  const handleGrant = async () => {
    const n = Number(pct);
    if (pct === "" || !Number.isInteger(n) || n < 0 || n > 100) {
      toast.error("Scholarship % must be an integer 0–100");
      return;
    }
    const parsedExpiry = parseExpiryInput(expires);
    if (parsedExpiry.error) {
      toast.error(parsedExpiry.error);
      return;
    }
    setSaving(true);
    try {
      await api.createUserAward({
        user_id: candidate.user_id,
        scholarship_pct: n,
        reason: reason.trim() || undefined,
        redemption_expires_at: parsedExpiry.value ?? undefined,
      });
      toast.success(`Award of ${n}% granted to ${candidate.fullname || "candidate"}`);
      await onAwardGranted();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to create award");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      data-testid="completed-candidate-row"
      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition shadow-2xs space-y-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">
              {candidate.fullname || "Unnamed Candidate"}
            </span>
            {candidate.number && (
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {candidate.number}
              </span>
            )}
            {isAwarded ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Awarded {candidate.active_award_pct}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3 h-3" /> Awaiting Award
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span>Completed: {formatDateTimeIST(candidate.finished_at)}</span>
            <span>·</span>
            <span className="font-semibold text-slate-600">
              Score: {candidate.score != null ? `${Math.round(candidate.score)}%` : "—"}
              {candidate.earned_points != null && candidate.total_points != null
                ? ` (${candidate.earned_points}/${candidate.total_points} pts)`
                : ""}
            </span>
          </div>
        </div>

        {isAwarded && candidate.active_award_expires_at && (
          <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
            Redeem by: {formatDateTimeIST(candidate.active_award_expires_at)}
          </span>
        )}
      </div>

      {!isAwarded && (
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-end gap-2.5">
          <div className="w-24">
            <label className={labelCls}>Scholarship %</label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              placeholder="e.g. 25"
              className={inputCls}
            />
          </div>

          <div className="w-64">
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls}>Redeem until (IST)</label>
              <div className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold">
                <button
                  type="button"
                  onClick={() => addHours(24)}
                  className="hover:underline px-1 py-0.2 rounded bg-blue-50"
                >
                  +24h
                </button>
                <button
                  type="button"
                  onClick={() => addHours(48)}
                  className="hover:underline px-1 py-0.2 rounded bg-blue-50"
                >
                  +48h
                </button>
                <button
                  type="button"
                  onClick={() => addHours(168)}
                  className="hover:underline px-1 py-0.2 rounded bg-blue-50"
                >
                  +7d
                </button>
              </div>
            </div>
            <input
              type="datetime-local"
              min={minExpiryInput}
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
              title="Redemption deadline for this candidate. Leave blank to use exam global window."
              className={inputCls}
            />
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className={labelCls}>Note (optional)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Internal admin note"
              className={inputCls}
            />
          </div>

          <button
            type="button"
            onClick={handleGrant}
            disabled={saving || pct === ""}
            className={`${btn.primary} shrink-0 px-4 !py-2.5 ${
              pct === "" ? "opacity-40 cursor-not-allowed" : ""
            }`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Grant Award
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Active Award Row ─────────────────────────────────────────────────────────

function AwardRow({ award, onUpdate, onRevoke }) {
  const [pct, setPct] = useState(String(award.scholarship_pct));
  const [reason, setReason] = useState(award.reason || "");
  const savedExpires = toLocalInput(award.redemption_expires_at || "");
  const [expires, setExpires] = useState(savedExpires);
  const [saving, setSaving] = useState(false);

  const dirty =
    Number(pct) !== Number(award.scholarship_pct) ||
    (reason || "") !== (award.reason || "") ||
    expires !== savedExpires;

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(award, pct, reason.trim() || null, expires);
    setSaving(false);
  };

  return (
    <div
      data-testid="award-row"
      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition"
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {award.fullname || "Unnamed User"}
            {award.number && <span className="font-normal text-slate-400 ml-2">{award.number}</span>}
          </p>
          {award.reason && <p className="text-xs text-slate-400 truncate">{award.reason}</p>}
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <WindowChip award={award} />
          <button
            data-testid="award-revoke-btn"
            onClick={() => onRevoke(award)}
            className={`${btn.dangerGhost} !px-2 !py-1 text-xs`}
          >
            <Trash2 className="w-3 h-3" /> Revoke
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-end gap-2.5">
        <div className="w-24">
          <label className={labelCls}>%</label>
          <input
            data-testid="award-row-pct"
            type="number"
            min={0}
            max={100}
            step={1}
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="w-52">
          <label className={labelCls}>Redeem until (IST)</label>
          <input
            data-testid="award-row-expires"
            type="datetime-local"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            title="Leave blank to use the exam's global window"
            className={inputCls}
          />
        </div>
        <div className="flex-1">
          <label className={labelCls}>Note</label>
          <input
            data-testid="award-row-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Internal note"
            className={inputCls}
          />
        </div>
        <button
          data-testid="award-row-save"
          onClick={handleSave}
          disabled={!dirty || saving}
          className={`${btn.secondary} shrink-0 !px-3 ${!dirty ? "opacity-40" : ""}`}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>
      </div>
    </div>
  );
}

function WindowChip({ award }) {
  if (!award.redemption_expires_at) {
    return (
      <span
        data-testid="award-window-global"
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-semibold"
      >
        <Clock className="w-3 h-3" /> Global window
      </span>
    );
  }
  const msLeft = award.hours_left != null ? award.hours_left * 3600000 : null;
  const label = formatTimeLeft(msLeft);
  const expired = msLeft != null && msLeft <= 0;
  const urgent = !expired && msLeft != null && msLeft < 24 * 3600000;
  const cls = expired
    ? "bg-red-50 text-red-600 border border-red-200"
    : urgent
      ? "bg-amber-50 text-amber-700 border border-amber-200"
      : "bg-emerald-50 text-emerald-700 border border-emerald-200";
  return (
    <span
      data-testid="award-window-chip"
      title={`Redeem until ${formatDateTimeIST(award.redemption_expires_at)} (IST)`}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cls}`}
    >
      <Clock className="w-3 h-3" /> {label || "—"}
    </span>
  );
}
