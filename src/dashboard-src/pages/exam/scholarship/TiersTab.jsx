import { useEffect, useState, useMemo } from "react";
import { Award, Plus, Trash2, Loader2, Lock, Info } from "lucide-react";
import toast from "react-hot-toast";
import * as api from "../../../../api/scholarshipExamApi";
import { useScholarshipWorkspace } from "./index";
import { toUTC, toLocalInput, formatDateTime } from "../../../../utils/dateTime";
import { btn, inputCls, labelCls } from "./ui/buttons";

export default function TiersTab() {
  const { selectedExam, loadTiers: reloadParentTiers } = useScholarshipWorkspace();
  const testId = selectedExam?.test_id;
  const isLocked = !!selectedExam?.results_visible;

  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submissions, setSubmissions] = useState([]);

  // form for new tier
  const [newMinScore, setNewMinScore] = useState("");
  const [newPct, setNewPct] = useState("");
  const [expiresInput, setExpiresInput] = useState("");
  const [expiresSaving, setExpiresSaving] = useState(false);

  useEffect(() => {
    setExpiresInput(toLocalInput(selectedExam?.redemption_expires_at || ""));
  }, [selectedExam?.redemption_expires_at]);

  const handleSaveExpiry = async (overrideVal) => {
    if (isLocked) return;
    // Only a string is a real override. Wiring this straight to onClick would
    // otherwise pass a click event as the value and turn every save into a
    // parse failure — guard the sentinel here so no call site can reintroduce it.
    const override = typeof overrideVal === "string" ? overrideVal : undefined;
    setExpiresSaving(true);
    try {
      const raw = override !== undefined ? override : expiresInput;
      const val = raw ? toUTC(raw) : null;
      await api.updateExam(testId, { redemption_expires_at: val });
      toast.success(val ? "Expiry saved (IST)" : "Expiry cleared");
      if (override !== undefined) setExpiresInput(override);
      reloadParentTiers?.();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to save expiry");
    } finally {
      setExpiresSaving(false);
    }
  };

  const fetchTiers = async () => {
    if (!testId) {
      setLoading(false);
      setTiers([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.listTiers(testId);
      setTiers(res.data?.tiers || []);
      reloadParentTiers?.();
    } catch (err) {
      const status = err?.response?.status;
      // Empty (no tiers yet) is success with tiers=[] — only toast on real network/server error
      if (status === 404) {
        setTiers([]);
      } else {
        const msg = err?.response?.data?.msg || "";
        // Table not yet migrated (42P01) surfaces as 500 — treat as empty + hint
        if (msg.includes("scholarship_test_tier") || err?.response?.status === 500) {
          setTiers([]);
          console.warn("Tiers table not ready — restart backend to run migrations:", msg);
        } else {
          toast.error("Failed to load tiers");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    if (!testId) return;
    try {
      const res = await api.getExamSubmissions(testId);
      setSubmissions(res.data?.submissions || []);
    } catch {
      // silent — preview just won't show
    }
  };

  useEffect(() => {
    fetchTiers();
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  // Live preview: bucket completed submissions by highest matching tier
  const preview = useMemo(() => {
    if (tiers.length === 0 || submissions.length === 0) return null;
    const completed = submissions.filter((s) => s.status === "completed" && s.score != null);
    if (completed.length === 0) return null;
    const sorted = [...tiers].sort((a, b) => Number(b.min_score) - Number(a.min_score));
    const buckets = sorted.map((t) => ({ tier: t, count: 0 }));
    let none = 0;
    for (const s of completed) {
      const score = Number(s.score);
      let matched = null;
      for (let i = 0; i < sorted.length; i++) {
        if (score >= Number(sorted[i].min_score)) {
          matched = i;
          break;
        }
      }
      if (matched !== null) buckets[matched].count += 1;
      else none += 1;
    }
    return { buckets, none, total: completed.length };
  }, [tiers, submissions]);

  const handleAdd = async () => {
    if (isLocked) return;
    const minScore = Number(newMinScore);
    const pct = Number(newPct);
    if (Number.isNaN(minScore) || Number.isNaN(pct)) {
      toast.error("Both fields are required and must be numbers");
      return;
    }
    if (minScore < 0 || minScore > 100 || pct < 0 || pct > 100) {
      toast.error("Values must be between 0 and 100");
      return;
    }
    setSaving(true);
    try {
      await api.createTier(testId, { min_score: minScore, scholarship_pct: pct });
      toast.success("Tier added");
      setNewMinScore("");
      setNewPct("");
      await fetchTiers();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to add tier");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tierId) => {
    if (isLocked) return;
    setSaving(true);
    try {
      await api.deleteTier(testId, tierId);
      toast.success("Tier deleted");
      await fetchTiers();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to delete tier");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (tier, field, value) => {
    if (isLocked) return;
    const num = Number(value);
    if (value === "" || Number.isNaN(num)) return;
    if (num < 0 || num > 100) {
      toast.error("Value must be between 0 and 100");
      return;
    }
    try {
      await api.updateTier(testId, tier.tier_id, { [field]: num });
      await fetchTiers();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to update tier");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#002856]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {isLocked && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Tiers are locked because results are visible. Hide results to edit.
          </p>
        </div>
      )}

      {/* Redemption window (overall, optional, IST) */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <Info className="w-4 h-4" />
          </span>
          <h3 className="text-sm font-bold text-slate-700">Redemption window</h3>
          <span className="text-xs text-slate-400">— optional, IST, live countdown on result screen</span>
        </div>
        {selectedExam?.redemption_expires_at && !expiresInput && (
          <p className="text-xs text-slate-500 mb-2">Current: {formatDateTime(selectedExam.redemption_expires_at)} IST</p>
        )}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className={labelCls}>Redeem until (IST)</label>
            <input
              type="datetime-local"
              value={expiresInput}
              disabled={isLocked}
              onChange={(e) => setExpiresInput(e.target.value)}
              className={`${inputCls} ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
            />
          </div>
          <button
            onClick={() => handleSaveExpiry()}
            disabled={isLocked || expiresSaving}
            className={`${btn.primary} shrink-0 ${isLocked ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {expiresSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </button>
          {expiresInput && (
            <button
              onClick={() => handleSaveExpiry("")}
              disabled={isLocked || expiresSaving}
              className={`${btn.secondary} shrink-0`}
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">When set, eligible candidates see a live countdown. When expired, the percentage is hidden but "Contact SkillCase Team" stays. Locked while results are visible.</p>
      </div>

      {/* Live preview strip */}
      {preview && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl px-5 py-4">
          <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" /> Live preview — {preview.total} completed submission{preview.total !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {preview.buckets.map(({ tier, count }) => (
              <span key={tier.tier_id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#eef2f6] text-[#002856] font-semibold">
                <Award className="w-3 h-3" />
                {tier.min_score}% → {tier.scholarship_pct}% scholarship: <b>{count}</b> candidate{count !== 1 ? "s" : ""}
              </span>
            ))}
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 font-semibold">
              No scholarship: <b className="ml-1">{preview.none}</b>
            </span>
          </div>
        </div>
      )}

      {/* Tier list */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 rounded-lg bg-[#eef2f6] flex items-center justify-center text-[#002856]">
            <Award className="w-4 h-4" />
          </span>
          <h3 className="text-sm font-bold text-slate-700">Scholarship tiers</h3>
          <span className="text-xs text-slate-400">— highest match wins, inclusive boundary</span>
        </div>

        {tiers.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
            <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">No tiers yet</p>
            <p className="text-xs text-slate-400 mt-1">Add at least one tier before you can release results.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tiers.map((t) => (
              <div key={t.tier_id} className="flex items-end gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <div className="flex-1">
                  <label className={labelCls}>Min score (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={t.min_score}
                    disabled={isLocked}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTiers((prev) => prev.map((x) => x.tier_id === t.tier_id ? { ...x, min_score: v === "" ? "" : Number(v) } : x));
                    }}
                    onBlur={(e) => {
                      const raw = e.target.value;
                      if (raw === "" || Number(raw) === Number(t.min_score)) return;
                      // Revert optimistic value to server value on failure inside handleEdit
                      handleEdit(t, "min_score", raw);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.target.blur();
                    }}
                    className={`${inputCls} ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </div>
                <div className="flex-1">
                  <label className={labelCls}>Scholarship (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={0.01}
                    value={t.scholarship_pct}
                    disabled={isLocked}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTiers((prev) => prev.map((x) => x.tier_id === t.tier_id ? { ...x, scholarship_pct: v === "" ? "" : Number(v) } : x));
                    }}
                    onBlur={(e) => {
                      const raw = e.target.value;
                      if (raw === "" || Number(raw) === Number(t.scholarship_pct)) return;
                      handleEdit(t, "scholarship_pct", raw);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.target.blur();
                    }}
                    className={`${inputCls} ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </div>
                <button
                  onClick={() => handleDelete(t.tier_id)}
                  disabled={isLocked || saving}
                  className={`${btn.dangerGhost} shrink-0 ${isLocked ? "opacity-40 cursor-not-allowed" : ""}`}
                  title="Delete tier"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add tier form */}
        <div className="mt-5 pt-5 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 mb-3">Add a new tier</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className={labelCls}>Min score (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                placeholder="e.g. 80"
                value={newMinScore}
                disabled={isLocked}
                onChange={(e) => setNewMinScore(e.target.value)}
                className={`${inputCls} ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
              />
            </div>
            <div className="flex-1">
              <label className={labelCls}>Scholarship (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                placeholder="e.g. 20"
                value={newPct}
                disabled={isLocked}
                onChange={(e) => setNewPct(e.target.value)}
                className={`${inputCls} ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={isLocked || saving}
              className={`${btn.primary} shrink-0 ${isLocked ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add tier
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Example: Min 80 → 20% means anyone scoring 80% or above gets 20% scholarship.</p>
        </div>
      </div>
    </div>
  );
}
