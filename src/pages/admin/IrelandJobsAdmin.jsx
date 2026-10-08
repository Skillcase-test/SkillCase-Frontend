import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  RefreshCw,
  Search,
  UserPlus,
  ExternalLink,
  AlertCircle,
  ArrowLeft,
  X,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Phone,
  Settings,
  GripVertical,
} from "lucide-react";
import {
  adminGetIrelandCandidates,
  adminGetIrelandCandidateDetail,
  adminUpdateIrelandCandidate,
  adminReviewIrelandResume,
  adminReviewIrelandDocument,
  adminGetIrelandDocRequirements,
  adminAddIrelandDocRequirement,
  adminDeleteIrelandDocRequirement,
  adminEnrollIrelandCandidate,
  adminSetIrelandActive,
  adminGetIrelandStepsConfig,
  adminUpdateIrelandStepsConfig,
} from "../../api/irelandJobsAdminApi";
import IrelandOpportunityEditor from "./components/IrelandOpportunityEditor";
import SortableStepItem from "./components/SortableStepItem";

const TABS = [
  { key: "candidates", label: "Candidates List" },
  { key: "requirements", label: "Doc Requirements" },
  { key: "opportunity", label: "Opportunity Pages" },
  { key: "enroll", label: "Enroll Candidate", editOnly: true },
];

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "pending_review", label: "Pending Review" },
  { key: "needs_ielts", label: "Needs IELTS" },
  { key: "ielts_interest", label: "IELTS Interest" },
  { key: "completed", label: "Completed" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

const QUALIFICATIONS = [
  "Bsc Nursing",
  "GNM",
  "ANM",
  "Msc Nursing",
  "Post Basic Bsc Nursing",
];

const STEP_TITLES = {
  welcome: "Welcome",
  resume_profile: "Resume & Profile",
  documents: "Documents",
  role_select: "Choose Your Path",
  matching: "Opportunity Matching",
};

const STEP_COPY = {
  welcome: "Welcome checkpoint onboarding the candidate into the pipeline.",
  resume_profile:
    "Verification of candidate credentials and uploaded resume.",
  documents:
    "Verify the candidate's supporting document submissions.",
  role_select: "Candidate picks the Nurse or Caregiver pathway.",
  matching:
    "Terminal step — the placement team is matching live opportunities.",
};

// Mirrors the German list's summary cards (JobScreeningAdmin) — click filters.
const STAT_CARDS = [
  {
    key: "all",
    label: "Total Candidates",
    tone: "border-slate-200 bg-white text-slate-900 hover:border-slate-300",
  },
  {
    key: "pending_review",
    label: "Pending Review",
    tone: "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300",
  },
  {
    key: "needs_ielts",
    label: "Needs IELTS",
    tone: "border-orange-200 bg-orange-50 text-orange-900 hover:border-orange-300",
  },
  {
    key: "ielts_interest",
    label: "IELTS Interest",
    tone: "border-purple-200 bg-purple-50 text-purple-900 hover:border-purple-300",
  },
  {
    key: "completed",
    label: "Completed",
    tone: "border-blue-200 bg-blue-50 text-blue-900 hover:border-blue-300",
  },
  {
    key: "active",
    label: "Active Candidates",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300",
  },
  {
    key: "inactive",
    label: "Inactive Candidates",
    tone: "border-rose-200 bg-rose-50 text-rose-900 hover:border-rose-300",
  },
];

const formatScreeningTimestamp = (dateInput) => {
  if (!dateInput) return "Not available";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "Not available";

  return `${new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date)} IST`;
};

const fmtDate = (iso) => {
  if (!iso) return "Not available";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(d);
};

export default function IrelandJobsAdmin({ canEdit = true }) {
  const [view, setView] = useState("list"); // list | detail
  const [activeTab, setActiveTab] = useState("candidates");
  const [candidates, setCandidates] = useState([]);
  const [summary, setSummary] = useState({});
  const [listLoading, setListLoading] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editQualification, setEditQualification] = useState("");

  const [requirements, setRequirements] = useState(null);
  const [newDocLabel, setNewDocLabel] = useState("");

  // Global pipeline step order (ireland_screening_settings.steps_config).
  const [stepsConfig, setStepsConfig] = useState(null); // {steps, isCustomized}
  const [stepsDraft, setStepsDraft] = useState([]);
  const [stepsDirty, setStepsDirty] = useState(false);

  // Per-candidate step order — seeded from detail.steps, saved via
  // adminUpdateIrelandCandidate({steps_config}).
  const [candidateSteps, setCandidateSteps] = useState([]);

  const [enrollIdentifier, setEnrollIdentifier] = useState("");
  const [enrollQualification, setEnrollQualification] = useState("");

  const [confirmModal, setConfirmModal] = useState(null);
  const [reasonValue, setReasonValue] = useState("");

  const openConfirmModal = ({
    title,
    message,
    requireReason = false,
    onConfirm,
  }) => {
    setReasonValue("");
    setConfirmModal({ title, message, requireReason, onConfirm });
  };
  const closeConfirmModal = () => setConfirmModal(null);

  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await adminGetIrelandCandidates(
        page,
        limit,
        appliedSearch,
        statusFilter,
      );
      const data = res.data?.data || {};
      setCandidates(data.candidates || []);
      setTotal(data.total || 0);
      setSummary(data.summary || {});
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load Ireland candidates",
      );
    } finally {
      setListLoading(false);
    }
  }, [page, appliedSearch, statusFilter]);

  // Debounce search input changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setAppliedSearch(searchVal);
      setPage(1);
    }, 450);
    return () => clearTimeout(delayDebounce);
  }, [searchVal]);

  useEffect(() => {
    if (view === "list" && activeTab === "candidates") fetchList();
  }, [fetchList, view, activeTab]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const loadRequirements = async () => {
    try {
      const res = await adminGetIrelandDocRequirements();
      setRequirements(res.data?.data || { documents: [] });
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load document requirements",
      );
    }
    try {
      const res = await adminGetIrelandStepsConfig();
      const data = res.data?.data || { steps: [], isCustomized: false };
      setStepsConfig(data);
      if (!stepsDirty) setStepsDraft(data.steps || []);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load pipeline step order",
      );
    }
  };

  // --- Global pipeline step order (drag → draft → save) ----------------------

  const handleDragEndStepsConfig = (event) => {
    if (!canEdit) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stepsDraft.findIndex((s) => s.id === active.id);
    const newIndex = stepsDraft.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setStepsDraft(arrayMove(stepsDraft, oldIndex, newIndex));
    setStepsDirty(true);
  };

  const saveStepsConfig = async () => {
    if (!canEdit || saving || !stepsDirty) return;
    setSaving(true);
    try {
      const res = await adminUpdateIrelandStepsConfig({
        steps: stepsDraft.map((s) => ({
          id: s.id,
          title: s.title,
          button_title: s.button_title,
          is_skippable: s.is_skippable,
        })),
      });
      const data = res.data?.data;
      setStepsConfig(data);
      setStepsDraft(data?.steps || []);
      setStepsDirty(false);
      toast.success("Pipeline step order saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save step order");
    } finally {
      setSaving(false);
    }
  };

  const resetStepsConfig = () => {
    if (!canEdit) return;
    openConfirmModal({
      title: "Reset Pipeline Step Order?",
      message:
        "This restores the default Ireland pipeline order for every candidate who doesn't have a custom order.",
      onConfirm: () =>
        runReview(
          () => adminUpdateIrelandStepsConfig({ reset: true }),
          "Step order reset to defaults",
        ).then(() => setStepsDirty(false)),
    });
  };

  // --- Per-candidate step order + skip (detail view) -------------------------

  const detailStepsJson = JSON.stringify(detail?.steps || []);
  useEffect(() => {
    setCandidateSteps(JSON.parse(detailStepsJson));
  }, [detailStepsJson]);

  const persistCandidateSteps = (updatedSteps) => {
    setCandidateSteps(updatedSteps);
    runReview(
      () =>
        adminUpdateIrelandCandidate(user.user_id, {
          steps_config: updatedSteps,
        }),
      "Step order updated",
    );
  };

  const handleDragEndCandidate = (event) => {
    if (!canEdit) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = candidateSteps.findIndex((s) => s.id === active.id);
    const newIndex = candidateSteps.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    persistCandidateSteps(arrayMove(candidateSteps, oldIndex, newIndex));
  };

  const handleToggleSkippable = (stepId, shouldSkip) => {
    if (!canEdit) return;
    const updatedSteps = candidateSteps.map((s) =>
      s.id === stepId
        ? { ...s, is_skippable: shouldSkip, status: shouldSkip ? "skipped" : "pending" }
        : s,
    );
    persistCandidateSteps(updatedSteps);
  };

  // --- Per-step resets (German pattern: confirm → PATCH flag → refresh) ------

  const resetCheckpoint = (flag, title, message) => {
    if (!canEdit) return;
    openConfirmModal({
      title,
      message,
      onConfirm: () =>
        runReview(
          () => adminUpdateIrelandCandidate(user.user_id, { [flag]: true }),
          "Checkpoint reset",
        ),
    });
  };

  const resetActions = {
    welcome: () =>
      resetCheckpoint(
        "reset_welcome",
        "Reset Welcome Checkpoint?",
        "The welcome step goes back to pending and the candidate will see it again.",
      ),
    resume_profile: () =>
      resetCheckpoint(
        "reset_profile",
        "Reset Resume & Profile?",
        "The uploaded CV, extracted fields and review verdict are cleared. The candidate will need to re-upload.",
      ),
    documents: () =>
      resetCheckpoint(
        "reset_documents",
        "Reset Documents Checkpoint?",
        "All uploaded documents and answers are cleared. The candidate will need to resubmit.",
      ),
    role_select: () =>
      resetCheckpoint(
        "reset_role",
        "Reset Pathway Selection?",
        "The chosen role, NMBI certificate and opportunity interest are cleared so the candidate can reselect.",
      ),
  };

  const openDetail = async (userId) => {
    setView("detail");
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await adminGetIrelandCandidateDetail(userId);
      const d = res.data?.data || null;
      setDetail(d);
      setEditQualification(d?.qualification || "");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load candidate");
      setView("list");
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!detail?.user?.user_id) return;
    try {
      const res = await adminGetIrelandCandidateDetail(detail.user.user_id);
      const d = res.data?.data || null;
      setDetail(d);
      setEditQualification(d?.qualification || "");
    } catch (_e) {
      /* keep stale detail */
    }
  };

  const closeDetail = () => {
    setView("list");
    setDetail(null);
    fetchList();
  };

  const runReview = async (fn, successMsg) => {
    if (saving) return;
    setSaving(true);
    try {
      await fn();
      toast.success(successMsg);
      await refreshDetail();
      fetchList();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const reviewDoc = (userId, docId, status, docLabel) => {
    if (status === "rejected") {
      openConfirmModal({
        title: `Reject "${docLabel || docId}"?`,
        message:
          "The message below will be shown to the candidate as the rejection reason.",
        requireReason: true,
        onConfirm: (reason) =>
          runReview(
            () => adminReviewIrelandDocument(userId, docId, status, reason),
            "Document rejected",
          ),
      });
      return;
    }
    runReview(
      () => adminReviewIrelandDocument(userId, docId, status),
      "Document approved",
    );
  };

  const reviewResume = (userId, status) => {
    if (status === "rejected") {
      openConfirmModal({
        title: "Reject Resume?",
        message:
          "This will mark the resume as rejected. The message below will be shown to the candidate as the reason for rejection.",
        requireReason: true,
        onConfirm: (reason) =>
          runReview(
            () => adminReviewIrelandResume(userId, status, reason),
            "Resume rejected",
          ),
      });
      return;
    }
    runReview(
      () => adminReviewIrelandResume(userId, status),
      "Resume approved",
    );
  };

  const addRequirement = async () => {
    const label = newDocLabel.trim();
    if (!label || saving) return;
    setSaving(true);
    try {
      const res = await adminAddIrelandDocRequirement(label);
      setRequirements((prev) => ({
        ...(prev || {}),
        documents: res.data?.data || [],
      }));
      setNewDocLabel("");
      toast.success("Document requirement added");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add document");
    } finally {
      setSaving(false);
    }
  };

  const removeRequirement = async (docId) => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await adminDeleteIrelandDocRequirement(docId);
      setRequirements((prev) => ({
        ...(prev || {}),
        documents: res.data?.data || [],
      }));
      toast.success("Document removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove document");
    } finally {
      setSaving(false);
    }
  };

  const enroll = async () => {
    const identifier = enrollIdentifier.trim();
    if (!identifier || saving) return;
    setSaving(true);
    try {
      await adminEnrollIrelandCandidate(identifier, enrollQualification || null);
      toast.success("Candidate enrolled in Ireland Jobs");
      setEnrollIdentifier("");
      setEnrollQualification("");
      setActiveTab("candidates");
      fetchList();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to enroll candidate");
    } finally {
      setSaving(false);
    }
  };

  const setActive = (userId, active) => {
    if (!active) {
      openConfirmModal({
        title: "Deactivate candidate?",
        message:
          "They will see the inactive screen until reactivated. You can note a reason below.",
        onConfirm: (reason) =>
          runReview(
            () => adminSetIrelandActive(userId, false, reason || null),
            "Candidate deactivated",
          ),
      });
      return;
    }
    runReview(
      () => adminSetIrelandActive(userId, true),
      "Candidate reactivated",
    );
  };

  const confirmModalEl = confirmModal && (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-4">
          <AlertCircle className="w-6 h-6 animate-pulse" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 mb-2">
          {confirmModal.title}
        </h3>
        <p className="text-[11px] text-zinc-500 leading-relaxed mb-4">
          {confirmModal.message}
        </p>
        {confirmModal.requireReason && (
          <textarea
            value={reasonValue}
            onChange={(e) => setReasonValue(e.target.value)}
            placeholder="Type the message the candidate will see..."
            rows={3}
            className="w-full mb-4 p-3 text-[11px] text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300 resize-none"
          />
        )}
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={closeConfirmModal}
            className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 font-bold text-[11px] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={confirmModal.requireReason && !reasonValue.trim()}
            onClick={() => {
              confirmModal.onConfirm?.(reasonValue.trim());
              closeConfirmModal();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-[11px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === "requirements") loadRequirements();
  };

  const handleSummaryFilter = (key) => {
    setStatusFilter(key);
    setPage(1);
  };

  const user = detail?.user;
  const detailDocs = detail?.documents || {};
  const detailRequiredDocs = detail?.requiredDocuments || [];
  const detailSteps = detail?.steps || [];
  const stepTimestampsMap = detail?.stepTimestamps || {};
  const isCandidateActive = Boolean(detail?.isActive);
  const initials = (user?.fullname || user?.username || "?")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const nmbiRail = detail?.nmbi?.downloadUrl
    ? {
        filename: detail.nmbi.filename,
        downloadUrl: detail.nmbi.downloadUrl,
        status: detail.nmbi.status,
      }
    : null;
  const uploadedDocs = Object.entries(detailDocs).filter(
    ([, e]) => e?.downloadUrl,
  );
  if (nmbiRail) uploadedDocs.push(["nmbi", nmbiRail]);

  return (
    <>
      {/* Page header — mirrors JobScreeningAdmin */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-[#083262]">
              Ireland Jobs Admin
            </h1>
            {!canEdit && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                View Only
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {canEdit
              ? "Manage Ireland candidates, document requirements and enrollments."
              : "You have view-only access — editing and updates are disabled."}
          </p>
        </div>

        {view === "list" && (
          <div className="flex items-center gap-3">
            {(activeTab === "candidates" || activeTab === "requirements") && (
              <button
                type="button"
                onClick={() =>
                  activeTab === "candidates" ? fetchList() : loadRequirements()
                }
                disabled={listLoading}
                className="p-2 hover:bg-slate-50 border border-slate-150 rounded-xl text-slate-500 hover:text-slate-700 transition-all flex items-center gap-1.5 text-[11px] font-bold disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${listLoading ? "animate-spin" : ""}`}
                />
                Refresh List
              </button>
            )}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40">
              {TABS.filter((t) => canEdit || !t.editOnly).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleTabChange(t.key)}
                  className={`px-4 py-1.5 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                    activeTab === t.key
                      ? "bg-[#083262] text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {view === "detail" ? (
          /* ---------- Candidate detail (German CandidateDetail parity) ---------- */
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-full overflow-hidden">
            {/* Header bar */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeDetail}
                  className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-700 transition-all flex items-center gap-1.5 text-xs font-bold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Candidates</span>
                </button>
                <div className="h-4 w-px bg-slate-200" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-800">
                      Candidate Pipeline Details
                    </h2>
                    {!canEdit && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                        View Only
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Verify profile, documents and pathway selection.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshDetail}
                  disabled={saving}
                  className="p-2 hover:bg-slate-50 border border-slate-150 rounded-xl text-slate-500 hover:text-slate-700 transition-all flex items-center gap-1.5 text-[11px] font-bold disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      saving || detailLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="p-2 hover:bg-slate-50 border border-slate-150 rounded-xl text-slate-500 hover:text-slate-700 transition-all flex items-center gap-1.5 text-[11px] font-bold"
                >
                  <X className="w-3.5 h-3.5" />
                  Close
                </button>
              </div>
            </div>

            {/* Main split dashboard view */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 h-full">
              {/* Left Column: Profile Card */}
              <fieldset disabled={!canEdit} className="contents">
                <div className="md:col-span-5 border-r border-slate-100 p-5 flex flex-col gap-5 bg-slate-50/30 overflow-y-auto h-full">
                  {detailLoading && !detail ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs font-semibold gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#083262]" />
                      <span>Loading candidate...</span>
                    </div>
                  ) : !detail ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                      Candidate not found
                    </div>
                  ) : (
                    <>
                      {/* Summary profile badge */}
                      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,40,86,0.03)] flex flex-col shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-[#083262] text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-extrabold text-slate-800 text-sm leading-tight truncate">
                                {user?.fullname || "Unnamed Candidate"}
                              </h3>
                              {detail.qualification && (
                                <span className="px-1.5 py-0.5 bg-blue-50 text-[#083262] text-[8px] font-extrabold rounded-md border border-blue-100 uppercase tracking-wider">
                                  {detail.qualification}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                              {user?.email || "No Email"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500 border-t border-slate-100/60 pt-2.5">
                          <div className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{user?.number || "No Phone"}</span>
                          </div>
                          {detail.role && (
                            <span className="text-[#083262] font-bold text-[8px] uppercase tracking-wider bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100">
                              {detail.role}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              Candidate Activity
                            </span>
                            <span
                              className={`text-[11px] font-bold ${
                                isCandidateActive
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                              }`}
                            >
                              {isCandidateActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isCandidateActive}
                            aria-label={
                              isCandidateActive
                                ? "Mark candidate inactive"
                                : "Mark candidate active"
                            }
                            onClick={() => setActive(user.user_id, !isCandidateActive)}
                            disabled={saving}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 cursor-pointer ${
                              isCandidateActive
                                ? "bg-emerald-500"
                                : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                isCandidateActive
                                  ? "translate-x-6"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>

                        {!isCandidateActive && (
                          <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50/70 px-2.5 py-2 text-[9px] text-rose-700">
                            <span className="font-bold">Inactive by:</span>{" "}
                            {detail.inactiveEmail || "Admin"}
                            {detail.inactiveAt && (
                              <span className="block mt-0.5 text-rose-500">
                                {formatScreeningTimestamp(detail.inactiveAt)}
                              </span>
                            )}
                            {detail.inactiveReason && (
                              <span className="block mt-0.5 text-rose-500">
                                {detail.inactiveReason}
                              </span>
                            )}
                          </div>
                        )}

                        {detail.ieltsInterestAt && (
                          <div className="mt-2 rounded-lg border border-violet-100 bg-violet-50/70 px-2.5 py-2 text-[9px] text-violet-700">
                            <span className="font-bold">IELTS interest:</span>{" "}
                            {formatScreeningTimestamp(detail.ieltsInterestAt)}
                          </div>
                        )}
                      </div>

                      {/* Uploaded Documents List */}
                      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,40,86,0.03)] flex flex-col gap-2.5 shrink-0">
                        <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          Documents &amp; Submissions
                        </h4>

                        <div className="grid grid-cols-2 gap-2">
                          {detail.resume?.downloadUrl ? (
                            <div className="flex flex-col gap-1">
                              <a
                                href={detail.resume.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-between transition-all group text-xs text-slate-700"
                              >
                                <span className="font-bold truncate">
                                  Resume PDF
                                </span>
                                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-600 shrink-0" />
                              </a>
                            </div>
                          ) : (
                            <div className="p-2 border border-dashed border-slate-200 rounded-xl flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50/20 font-medium">
                              <span className="truncate">No Resume</span>
                            </div>
                          )}
                        </div>

                        {uploadedDocs.length > 0 && (
                          <div className="border-t border-slate-100 pt-2.5 mt-1.5 flex flex-col gap-1.5 text-left">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                              Supporting Documents
                            </span>
                            <div className="grid grid-cols-1 gap-1.5">
                              {uploadedDocs.map(([docId, entry]) => (
                                <a
                                  key={docId}
                                  href={entry.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-between transition-all group text-[10px] text-slate-700 font-medium"
                                >
                                  <div className="truncate pr-2 text-left">
                                    <span className="font-bold block truncate max-w-[170px]">
                                      {entry.filename || docId}
                                    </span>
                                    <span className="text-[7px] text-slate-400 uppercase">
                                      Status: {entry.status || "pending"}
                                    </span>
                                  </div>
                                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-600 shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Edit Candidate (Collapsible Accordion) */}
                      <details className="group border border-slate-200 rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,40,86,0.03)] shrink-0">
                        <summary className="p-4 text-xs font-bold text-slate-600 cursor-pointer select-none flex items-center justify-between hover:bg-slate-50/30">
                          <span className="flex items-center gap-1.5">
                            <Settings className="w-3.5 h-3.5 text-slate-400" />
                            Edit Candidate Details
                          </span>
                          <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                        </summary>

                        <div className="p-4 border-t border-slate-100 flex flex-col gap-4 bg-white">
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                Qualification
                              </label>
                              <div className="relative">
                                <select
                                  value={editQualification}
                                  onChange={(e) =>
                                    setEditQualification(e.target.value)
                                  }
                                  className="w-full border border-slate-200 rounded-xl p-2.5 pr-8 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] shadow-none transition-all appearance-none"
                                >
                                  <option value="">No qualification</option>
                                  {(
                                    detail.qualificationOptions || []
                                  ).map((q) => (
                                    <option key={q} value={q}>
                                      {q}
                                    </option>
                                  ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={
                              saving ||
                              (editQualification || "") ===
                                (detail.qualification || "")
                            }
                            onClick={() =>
                              runReview(
                                () =>
                                  adminUpdateIrelandCandidate(user.user_id, {
                                    qualification: editQualification || null,
                                  }),
                                "Candidate updated",
                              )
                            }
                            className="w-full py-2.5 bg-[#083262] text-white hover:bg-[#052243] rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-none"
                          >
                            {saving ? "Saving..." : "Save Candidate Details"}
                          </button>
                        </div>
                      </details>
                    </>
                  )}
                </div>
              </fieldset>

              {/* Right Column: Pipeline Steps Timeline */}
              <div className="md:col-span-7 overflow-y-auto p-6 bg-white h-full">
                <h3 className="text-xs font-bold text-[#083262] uppercase tracking-wider mb-6 pb-2 border-b border-slate-100">
                  Pipeline Steps Timeline
                </h3>

                {detailLoading && !detail ? null : !detail ? null : (
                  <div className="relative border-l-2 border-slate-100 ml-4 pl-8 space-y-6 py-2">
                    {detailSteps.map((step, index) => {
                      const isSkipped = step.status === "skipped";
                      const isCompleted =
                        step.status === "completed" || isSkipped;
                      const isActive = step.id === detail.currentStepId;
                      const stepTimestamps =
                        stepTimestampsMap[step.id] || {};
                      // A reset is offered once the step holds real data —
                      // completed/skipped, or a partial submission exists.
                      const stepHasData =
                        step.id === "welcome"
                          ? isCompleted
                          : step.id === "resume_profile"
                            ? isCompleted || detail.resume?.uploaded
                            : step.id === "documents"
                              ? isCompleted ||
                                Object.values(detailDocs).some(
                                  (d) => d?.filename || d?.answer,
                                )
                              : step.id === "role_select"
                                ? isCompleted || Boolean(detail.role)
                                : false;

                      return (
                        <div key={step.id} className="relative group">
                          {/* Timeline circle overlay */}
                          <div
                            className={`absolute -left-[42px] top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all ${
                              isCompleted
                                ? "bg-emerald-500 border-emerald-200 text-white shadow-sm"
                                : isActive
                                  ? "bg-[#083262] border-blue-200 text-white animate-pulse"
                                  : "bg-slate-100 border-slate-200 text-slate-400"
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              index + 1
                            )}
                          </div>

                          {/* Step container card */}
                          <div
                            className={`p-4 rounded-xl border transition-all ${
                              isActive
                                ? "bg-white border-blue-200 shadow-sm"
                                : isCompleted
                                  ? "bg-slate-50/20 border-slate-100"
                                  : "bg-slate-50/10 border-slate-100 opacity-60"
                            }`}
                          >
                            {/* Step Title & Status Badge */}
                            <div className="flex justify-between items-center mb-1.5 flex-wrap gap-2">
                              <h4 className="text-xs font-bold text-slate-800">
                                {step.title || STEP_TITLES[step.id] || step.id}
                              </h4>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                                  isCompleted
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : isActive
                                      ? "bg-blue-50 text-[#083262] border-blue-100"
                                      : "bg-slate-50 text-slate-400 border-slate-100"
                                }`}
                              >
                                {isSkipped
                                  ? "Skipped"
                                  : isCompleted
                                    ? "Completed"
                                    : isActive
                                      ? "Active"
                                      : "Locked"}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-1.5 mb-3 text-[10px] sm:grid-cols-2">
                              <div className="rounded-lg bg-white/80 border border-slate-100 px-2 py-1.5">
                                <span className="block uppercase tracking-wider text-[8px] font-bold text-slate-400">
                                  Started
                                </span>
                                <span className="font-semibold text-slate-600">
                                  {formatScreeningTimestamp(
                                    stepTimestamps.started_at,
                                  )}
                                </span>
                              </div>
                              <div className="rounded-lg bg-white/80 border border-slate-100 px-2 py-1.5">
                                <span className="block uppercase tracking-wider text-[8px] font-bold text-slate-400">
                                  Completed
                                </span>
                                <span className="font-semibold text-slate-600">
                                  {formatScreeningTimestamp(
                                    stepTimestamps.completed_at,
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Stage Info and Inline Actions */}
                            <div className="text-[11px] text-slate-500 leading-relaxed space-y-3">
                              <p>{STEP_COPY[step.id] || step.title}</p>

                              {/* Per-checkpoint reset — same affordance as the
                                  German pipeline detail view. */}
                              {canEdit &&
                                resetActions[step.id] &&
                                stepHasData && (
                                  <button
                                    type="button"
                                    onClick={resetActions[step.id]}
                                    disabled={saving}
                                    className="mt-1 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer disabled:opacity-40"
                                  >
                                    Reset {step.title || "Step"}
                                  </button>
                                )}

                              {/* Resume & profile verification */}
                              {step.id === "resume_profile" &&
                                (isActive || detail.resume?.uploaded) && (
                                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex flex-col gap-2.5">
                                    <span className="font-bold text-[#083262] block">
                                      Verify Profile &amp; Resume
                                    </span>

                                    <div className="border border-slate-150 bg-white rounded-lg p-2.5 flex flex-col gap-2">
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-slate-700">
                                          Resume / CV
                                        </span>
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                                            detail.resume?.status === "approved"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                              : detail.resume?.status ===
                                                  "rejected"
                                                ? "bg-rose-50 text-rose-700 border-rose-100"
                                                : "bg-amber-50 text-amber-700 border-amber-100"
                                          }`}
                                        >
                                          {detail.resume?.status || "pending"}
                                        </span>
                                      </div>

                                      {detail.resume?.uploaded ? (
                                        <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100/80 text-[10px] text-slate-500">
                                          <span className="truncate max-w-[150px] font-bold text-slate-700">
                                            {detail.resume.filename ||
                                              "resume.pdf"}
                                          </span>
                                          {detail.resume.downloadUrl && (
                                            <a
                                              href={detail.resume.downloadUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:underline flex items-center gap-0.5 shrink-0"
                                            >
                                              View file{" "}
                                              <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-[10px] text-zinc-400 font-semibold italic">
                                          Awaiting candidate upload.
                                        </p>
                                      )}

                                      {canEdit &&
                                        isActive &&
                                        detail.resume?.uploaded && (
                                        <div className="flex gap-2">
                                          {detail.resume.status !==
                                            "approved" && (
                                            <button
                                              type="button"
                                              disabled={saving}
                                              onClick={() =>
                                                reviewResume(
                                                  user.user_id,
                                                  "approved",
                                                )
                                              }
                                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer disabled:opacity-40"
                                            >
                                              Approve
                                            </button>
                                          )}
                                          {detail.resume.status !==
                                            "rejected" && (
                                            <button
                                              type="button"
                                              disabled={saving}
                                              onClick={() =>
                                                reviewResume(
                                                  user.user_id,
                                                  "rejected",
                                                )
                                              }
                                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-bold text-[10px] rounded-lg transition-all cursor-pointer disabled:opacity-40"
                                            >
                                              Reject
                                            </button>
                                          )}
                                        </div>
                                      )}

                                      {detail.resume?.status === "rejected" &&
                                        detail.resume?.rejectionReason && (
                                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[10px] text-amber-800 flex items-start justify-between gap-2">
                                            <span className="leading-relaxed">
                                              {detail.resume.rejectionReason}
                                            </span>
                                            <span
                                              className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase shrink-0 ${
                                                detail.resume.rejectionViewed
                                                  ? "bg-slate-100 text-slate-500"
                                                  : "bg-red-100 text-red-600"
                                              }`}
                                            >
                                              {detail.resume.rejectionViewed
                                                ? "Seen"
                                                : "Unseen"}
                                            </span>
                                          </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px]">
                                      <div className="rounded-lg bg-white/80 border border-slate-100 px-2 py-1.5">
                                        <span className="block uppercase tracking-wider text-[8px] font-bold text-slate-400">
                                          Experience
                                        </span>
                                        <span className="font-semibold text-slate-600">
                                          {detail.profileFields
                                            ?.experience_years != null
                                            ? `${detail.profileFields.experience_years} yrs`
                                            : "Not available"}
                                        </span>
                                      </div>
                                      <div className="rounded-lg bg-white/80 border border-slate-100 px-2 py-1.5">
                                        <span className="block uppercase tracking-wider text-[8px] font-bold text-slate-400">
                                          DOB
                                        </span>
                                        <span className="font-semibold text-slate-600">
                                          {fmtDate(detail.profileFields?.dob)}
                                        </span>
                                      </div>
                                      <div className="rounded-lg bg-white/80 border border-slate-100 px-2 py-1.5">
                                        <span className="block uppercase tracking-wider text-[8px] font-bold text-slate-400">
                                          Qualification
                                        </span>
                                        <span className="font-semibold text-slate-600">
                                          {detail.qualification ||
                                            "Not available"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                              {/* Supporting documents review */}
                              {step.id === "documents" && (
                                <div className="space-y-2">
                                  {detailRequiredDocs.length === 0 ? (
                                    <p className="text-[10px] text-zinc-400 font-semibold italic">
                                      No required documents configured.
                                    </p>
                                  ) : (
                                    detailRequiredDocs.map((doc) => {
                                      const entry = detailDocs[doc.id] || {};
                                      const isDocUploaded = Boolean(
                                        entry.downloadUrl || entry.filename,
                                      );
                                      return (
                                        <div
                                          key={doc.id}
                                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-800 text-[11px] truncate max-w-[200px] sm:max-w-xs block text-left">
                                              {doc.label}
                                              {doc.fixed && (
                                                <span className="ml-1.5 text-[8px] font-bold text-slate-400 uppercase">
                                                  required
                                                </span>
                                              )}
                                            </span>
                                            <span
                                              className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border tracking-wider shrink-0 ${
                                                isDocUploaded
                                                  ? entry.status === "approved"
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                    : entry.status ===
                                                        "rejected"
                                                      ? "bg-rose-50 text-rose-700 border-rose-100"
                                                      : "bg-amber-50 text-amber-700 border-amber-100"
                                                  : "bg-slate-100 text-slate-400 border-slate-200"
                                              }`}
                                            >
                                              {isDocUploaded
                                                ? entry.status === "approved"
                                                  ? "Approved"
                                                  : entry.status === "rejected"
                                                    ? "Rejected"
                                                    : "Pending Review"
                                                : entry.answer === "preparing"
                                                  ? "Preparing"
                                                  : entry.answer === "none"
                                                    ? "Not Available"
                                                    : "Awaiting Upload"}
                                            </span>
                                          </div>

                                          {isDocUploaded ? (
                                            <div className="flex flex-col gap-2">
                                              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100/80 text-[10px] text-slate-500">
                                                <span className="truncate max-w-[150px] font-bold text-slate-700">
                                                  {entry.filename || "document"}
                                                </span>
                                                {entry.downloadUrl && (
                                                  <a
                                                    href={entry.downloadUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline flex items-center gap-0.5 shrink-0"
                                                  >
                                                    View file{" "}
                                                    <ExternalLink className="w-2.5 h-2.5" />
                                                  </a>
                                                )}
                                              </div>

                                              {entry.status === "rejected" &&
                                                entry.rejectionReason && (
                                                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[10px] text-amber-800 text-left flex items-start justify-between gap-2">
                                                    <span className="leading-relaxed">
                                                      {entry.rejectionReason}
                                                    </span>
                                                  </div>
                                                )}

                                              {canEdit &&
                                                isActive &&
                                                entry.status !==
                                                  "approved" && (
                                                  <div className="flex gap-2 justify-start">
                                                    <button
                                                      type="button"
                                                      disabled={saving}
                                                      onClick={() =>
                                                        reviewDoc(
                                                          user.user_id,
                                                          doc.id,
                                                          "approved",
                                                          doc.label,
                                                        )
                                                      }
                                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer disabled:opacity-40"
                                                    >
                                                      Approve
                                                    </button>
                                                    {entry.status !==
                                                      "rejected" && (
                                                      <button
                                                        type="button"
                                                        disabled={saving}
                                                        onClick={() =>
                                                          reviewDoc(
                                                            user.user_id,
                                                            doc.id,
                                                            "rejected",
                                                            doc.label,
                                                          )
                                                        }
                                                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-bold text-[10px] rounded-lg transition-all cursor-pointer disabled:opacity-40"
                                                      >
                                                        Reject
                                                      </button>
                                                    )}
                                                  </div>
                                                )}
                                            </div>
                                          ) : (
                                            <p className="text-[10px] text-zinc-400 font-semibold italic">
                                              {entry.answer === "preparing"
                                                ? "Candidate is preparing this document."
                                                : entry.answer === "none"
                                                  ? "Candidate marked this as not available."
                                                  : "Not answered yet."}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}

                              {/* Role / pathway selection */}
                              {step.id === "role_select" && (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
                                  <span className="font-bold text-[#083262] block">
                                    Pathway
                                  </span>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md border uppercase tracking-wider ${
                                        detail.role
                                          ? "bg-blue-50 text-[#083262] border-blue-100"
                                          : "bg-slate-100 text-slate-400 border-slate-200"
                                      }`}
                                    >
                                      {detail.role || "Not chosen"}
                                    </span>
                                    {detail.ieltsInterestAt && (
                                      <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-md border uppercase tracking-wider bg-violet-50 text-violet-700 border-violet-100">
                                        IELTS interest
                                      </span>
                                    )}
                                    {detail.opportunityInterestAt && (
                                      <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-md border uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-100">
                                        Interested ✓
                                      </span>
                                    )}
                                  </div>
                                  {!detail.role && (
                                    <p className="text-[10px] text-slate-400 font-semibold">
                                      Awaiting candidate selection.
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* NMBI is hospital-required for nurses; it lives
                                  on role_select, not the shared documents step. */}
                              {step.id === "role_select" &&
                                detail.role === "nurse" &&
                                (() => {
                                  const nmbi = detail.nmbi || {};
                                  const isNmbiUploaded = Boolean(
                                    nmbi.downloadUrl || nmbi.filename,
                                  );
                                  return (
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-800 text-[11px] truncate max-w-[200px] sm:max-w-xs block text-left">
                                          NMBI Certificate
                                          <span className="ml-1.5 text-[8px] font-bold text-slate-400 uppercase">
                                            required
                                          </span>
                                        </span>
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border tracking-wider shrink-0 ${
                                            isNmbiUploaded
                                              ? nmbi.status === "approved"
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                : nmbi.status === "rejected"
                                                  ? "bg-rose-50 text-rose-700 border-rose-100"
                                                  : "bg-amber-50 text-amber-700 border-amber-100"
                                              : "bg-slate-100 text-slate-400 border-slate-200"
                                          }`}
                                        >
                                          {isNmbiUploaded
                                            ? nmbi.status === "approved"
                                              ? "Approved"
                                              : nmbi.status === "rejected"
                                                ? "Rejected"
                                                : "Pending Review"
                                            : "Awaiting Upload"}
                                        </span>
                                      </div>

                                      {isNmbiUploaded ? (
                                        <div className="flex flex-col gap-2">
                                          <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100/80 text-[10px] text-slate-500">
                                            <span className="truncate max-w-[150px] font-bold text-slate-700">
                                              {nmbi.filename || "document"}
                                            </span>
                                            {nmbi.downloadUrl && (
                                              <a
                                                href={nmbi.downloadUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline flex items-center gap-0.5 shrink-0"
                                              >
                                                View file{" "}
                                                <ExternalLink className="w-2.5 h-2.5" />
                                              </a>
                                            )}
                                          </div>

                                          {nmbi.status === "rejected" &&
                                            nmbi.rejectionReason && (
                                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[10px] text-amber-800 text-left flex items-start justify-between gap-2">
                                                <span className="leading-relaxed">
                                                  {nmbi.rejectionReason}
                                                </span>
                                              </div>
                                            )}

                                          {canEdit &&
                                            isActive &&
                                            nmbi.status !== "approved" && (
                                              <div className="flex gap-2 justify-start">
                                                <button
                                                  type="button"
                                                  disabled={saving}
                                                  onClick={() =>
                                                    reviewDoc(
                                                      user.user_id,
                                                      "nmbi",
                                                      "approved",
                                                      "NMBI Certificate",
                                                    )
                                                  }
                                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer disabled:opacity-40"
                                                >
                                                  Approve
                                                </button>
                                                {nmbi.status !== "rejected" && (
                                                  <button
                                                    type="button"
                                                    disabled={saving}
                                                    onClick={() =>
                                                      reviewDoc(
                                                        user.user_id,
                                                        "nmbi",
                                                        "rejected",
                                                        "NMBI Certificate",
                                                      )
                                                    }
                                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-bold text-[10px] rounded-lg transition-all cursor-pointer disabled:opacity-40"
                                                  >
                                                    Reject
                                                  </button>
                                                )}
                                              </div>
                                            )}
                                        </div>
                                      ) : (
                                        <p className="text-[10px] text-zinc-400 font-semibold italic">
                                          Awaiting candidate upload.
                                        </p>
                                      )}
                                    </div>
                                  );
                                })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Per-candidate pipeline reordering — same as the German
                    pipeline's "Customize Pipeline Step Order" accordion. */}
                {canEdit && candidateSteps.length > 0 && (
                  <details className="group border border-slate-100 rounded-xl bg-slate-50/20 mt-6 overflow-hidden">
                    <summary className="p-3 text-xs font-bold text-slate-600 bg-slate-50/50 cursor-pointer select-none flex items-center justify-between hover:bg-slate-50">
                      <span>Customize Pipeline Step Order (Advanced)</span>
                      <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="p-4 border-t border-slate-100 flex flex-col gap-3 bg-white">
                      <div className="text-[10px] text-slate-500 font-medium mb-2">
                        Drag steps to reorder the pipeline sequence for this
                        candidate, or mark a step as skipped.
                      </div>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEndCandidate}
                      >
                        <SortableContext
                          items={candidateSteps.map((s) => s.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {candidateSteps.map((step) => (
                            <SortableStepItem
                              key={step.id}
                              id={step.id}
                              step={step}
                              onToggleSkippable={handleToggleSkippable}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === "candidates" ? (
          /* ---------- Candidates tab (German stats grid + CandidateList parity) ---------- */
          <div className="h-full min-h-0 flex flex-col gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2 shrink-0">
              {STAT_CARDS.map((item) => {
                const isCardActive =
                  statusFilter === item.key ||
                  (item.key === "all" && statusFilter === "all");
                return (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() => handleSummaryFilter(item.key)}
                    aria-pressed={isCardActive}
                    title={`Filter by ${item.label}`}
                    className={`relative flex min-w-0 flex-col justify-between rounded-xl border px-3 py-2.5 text-left shadow-sm transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${item.tone} ${
                      isCardActive
                        ? "ring-2 ring-[#083262]/25 ring-offset-1"
                        : ""
                    }`}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className="min-h-6 text-[9px] font-semibold uppercase leading-3 tracking-wide opacity-80">
                        {item.label}
                      </span>
                      <span
                        className={`mt-0.5 h-2 w-2 shrink-0 rounded-full transition-all ${
                          isCardActive
                            ? "bg-current shadow-[0_0_0_3px_rgba(255,255,255,0.75)]"
                            : "bg-current opacity-20"
                        }`}
                      />
                    </div>
                    <span className="mt-1 block text-lg font-bold leading-none tabular-nums">
                      {Number(summary[item.key === "all" ? "total" : item.key]) ||
                        0}
                    </span>
                    <span className="mt-1 text-[8px] font-medium opacity-60">
                      {isCardActive ? "Showing candidates" : "Click to filter"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex-1 min-h-0">
              <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                {/* Search Header */}
                <div className="p-3 border-b border-slate-100 bg-white">
                  <div className="flex flex-col lg:flex-row lg:items-end gap-2.5">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search by name or phone..."
                        value={searchVal}
                        onChange={(e) => setSearchVal(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#083262] focus:border-transparent transition-all"
                      />
                    </div>

                    <div className="flex flex-wrap items-end gap-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                          Status
                        </span>
                        <select
                          value={statusFilter}
                          onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                          }}
                          className="h-8 min-w-28 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-600 outline-none transition focus:border-[#083262] focus:ring-2 focus:ring-[#083262]/10"
                        >
                          {STATUS_FILTERS.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Candidate List Container */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {listLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs font-semibold gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#083262]" />
                      <span>Loading candidates...</span>
                    </div>
                  ) : candidates.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                      No candidates found
                    </div>
                  ) : (
                    candidates.map((c) => {
                      const progressPercent =
                        c.steps_total > 0
                          ? Math.round(
                              (c.steps_completed / c.steps_total) * 100,
                            )
                          : 0;
                      const currentStepTitle =
                        STEP_TITLES[c.current_step_id] ||
                        c.current_step_id ||
                        "Welcome";

                      return (
                        <button
                          type="button"
                          key={c.user_id}
                          onClick={() => openDetail(c.user_id)}
                          className="w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col gap-2.5 bg-white hover:bg-slate-50/50 border-slate-100"
                        >
                          {/* Name & Qualification */}
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-sm truncate max-w-[170px]">
                              {c.fullname || "Unnamed Candidate"}
                            </span>
                            {c.qualification && (
                              <span className="px-2 py-0.5 bg-blue-50 text-[#083262] text-[9px] font-extrabold rounded-md border border-blue-100 uppercase">
                                {c.qualification}
                              </span>
                            )}
                          </div>

                          {/* Email & Current Step Label */}
                          <div className="flex flex-col gap-1 text-[11px] text-slate-500">
                            <div className="flex justify-between items-center">
                              <span className="truncate max-w-[150px]">
                                {c.email || c.number || "No Contact"}
                              </span>
                              <span className="font-bold text-slate-600 text-[10px] truncate max-w-[120px]">
                                {currentStepTitle}
                              </span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#083262] rounded-full transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-[#083262] shrink-0">
                              {progressPercent}%
                            </span>
                          </div>

                          {/* Activity and verification markers */}
                          <div className="flex items-center gap-1.5 self-start mt-0.5 flex-wrap">
                            <span
                              className={`px-1.5 py-0.5 rounded-md border text-[9px] font-bold ${
                                c.is_active === false
                                  ? "bg-rose-50 border-rose-100 text-rose-600"
                                  : "bg-emerald-50 border-emerald-100 text-emerald-600"
                              }`}
                            >
                              {c.is_active === false ? "Inactive" : "Active"}
                            </span>
                            {c.needs_review && (
                              <span className="px-1.5 py-0.5 rounded-md border text-[9px] font-bold bg-amber-50 border-amber-100 text-amber-600">
                                Needs review
                              </span>
                            )}
                            {c.needs_ielts && (
                              <span className="px-1.5 py-0.5 rounded-md border text-[9px] font-bold bg-rose-50 border-rose-100 text-rose-600">
                                Missing IELTS
                              </span>
                            )}
                            {c.ielts_interest_at && (
                              <span className="px-1.5 py-0.5 rounded-md border text-[9px] font-bold bg-violet-50 border-violet-100 text-violet-600">
                                IELTS interest
                              </span>
                            )}
                            {c.resume_status && (
                              <span
                                className={`px-1.5 py-0.5 rounded-md border text-[9px] font-bold ${
                                  c.resume_status === "approved"
                                    ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                                    : c.resume_status === "rejected"
                                      ? "bg-rose-50 border-rose-100 text-rose-600"
                                      : "bg-amber-50 border-amber-100 text-amber-600"
                                }`}
                              >
                                Resume: {c.resume_status}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="p-3 border-t border-slate-100 bg-white flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Page {page} of {totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                        disabled={page === 1 || listLoading}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPage((p) => Math.min(p + 1, totalPages))
                        }
                        disabled={page === totalPages || listLoading}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === "opportunity" ? (
          <IrelandOpportunityEditor canEdit={canEdit} />
        ) : activeTab === "requirements" ? (
          /* ---------- Doc Requirements tab (German settings-card parity) ---------- */
          <div className="h-full overflow-y-auto pr-1 pb-10">
            <div className="flex justify-between items-center mb-6 bg-slate-50 p-4 border border-slate-200/60 rounded-2xl">
              <div className="text-left">
                <h3 className="text-sm font-extrabold text-[#083262]">
                  Document Requirements
                </h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-relaxed">
                  IELTS is always required for nurses. Extra requirements added
                  here appear on every candidate&apos;s documents step.
                </p>
              </div>
            </div>

            {/* Pipeline Steps Order — global step sequence for the Ireland
                pipeline (same drag-to-reorder affordance as Job Screening). */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,40,86,0.03)] p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-bold text-[#083262] uppercase tracking-wider block text-left">
                  Pipeline Steps Order
                </span>
                {stepsConfig?.isCustomized && (
                  <span className="px-2 py-0.5 text-[8px] font-extrabold rounded-md border uppercase tracking-wider bg-amber-50 text-amber-700 border-amber-100">
                    Customized
                  </span>
                )}
              </div>

              <p className="text-[10px] text-slate-400 font-medium leading-relaxed -mt-1">
                Drag handles to reorder the default step sequence for Ireland
                candidates. Candidates with a saved custom order keep theirs.
              </p>

              <div className="space-y-2">
                {!stepsConfig ? (
                  <p className="text-[10px] text-slate-400 italic">Loading...</p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEndStepsConfig}
                  >
                    <SortableContext
                      items={stepsDraft.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {stepsDraft.map((step, idx) => (
                        <GlobalStepRow key={step.id} step={step} index={idx} />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {canEdit && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveStepsConfig}
                    disabled={!stepsDirty || saving}
                    className="flex-1 py-2.5 bg-[#083262] text-white hover:bg-[#052243] rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                  >
                    {saving ? "Saving..." : "Save Step Order"}
                  </button>
                  <button
                    type="button"
                    onClick={resetStepsConfig}
                    disabled={saving || !stepsConfig?.isCustomized}
                    className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                  >
                    Reset to Default
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,40,86,0.03)] p-5 flex flex-col gap-4">
              <span className="text-[10px] font-bold text-[#083262] uppercase tracking-wider block text-left border-b border-slate-100 pb-2">
                Checklist &amp; Documents
              </span>

              <div className="flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Supporting Documents
                  </label>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-1">
                    Candidates answer each requirement and can optionally upload
                    a file for review.
                  </p>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {!requirements ? (
                      <p className="text-[10px] text-slate-400 italic">
                        Loading...
                      </p>
                    ) : (requirements.documents || []).length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">
                        No documents configured.
                      </p>
                    ) : (
                      (requirements.documents || []).map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-2 text-[10px] gap-2"
                        >
                          <div className="truncate pr-2 text-left min-w-0 flex-1">
                            <span className="font-bold text-slate-700 block truncate">
                              {doc.label}
                            </span>
                            <span className="text-[8px] text-slate-400 font-medium">
                              {doc.fixed
                                ? "Built-in · required for nurses"
                                : "Admin-added requirement"}
                            </span>
                          </div>
                          {canEdit && !doc.fixed && (
                            <button
                              type="button"
                              onClick={() => removeRequirement(doc.id)}
                              disabled={saving}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer shrink-0 disabled:opacity-40"
                              title="Remove Requirement"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {canEdit && (
                  <div className="p-3 bg-slate-50/50 border border-slate-150 rounded-xl flex flex-col gap-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">
                      Add Document Requirement
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Passport copy"
                      value={newDocLabel}
                      onChange={(e) => setNewDocLabel(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addRequirement()}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-[#083262]"
                    />
                    <button
                      type="button"
                      onClick={addRequirement}
                      disabled={!newDocLabel.trim() || saving}
                      className="w-full py-2 bg-[#083262] hover:bg-[#052243] text-white font-bold text-[9px] rounded-lg transition-all mt-1 cursor-pointer disabled:opacity-40"
                    >
                      Add to Checklist
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ---------- Enroll tab (German settings-card parity) ---------- */
          <div className="h-full overflow-y-auto pr-1 pb-10">
            <div className="flex justify-between items-center mb-6 bg-slate-50 p-4 border border-slate-200/60 rounded-2xl">
              <div className="text-left">
                <h3 className="text-sm font-extrabold text-[#083262]">
                  Enroll Candidate
                </h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-relaxed">
                  Adds an existing user to the Ireland Jobs pipeline. They must
                  not be active in the Germany Jobs pipeline.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,40,86,0.03)] p-5 flex flex-col gap-4 max-w-xl">
              <span className="text-[10px] font-bold text-[#083262] uppercase tracking-wider block text-left border-b border-slate-100 pb-2">
                Candidate Details
              </span>

              <div className="flex flex-col gap-3 text-left">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Phone or User ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={enrollIdentifier}
                    onChange={(e) => setEnrollIdentifier(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] shadow-none transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Qualification (optional)
                  </label>
                  <div className="relative">
                    <select
                      value={enrollQualification}
                      onChange={(e) => setEnrollQualification(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 pr-8 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] shadow-none transition-all appearance-none"
                    >
                      <option value="">Select…</option>
                      {QUALIFICATIONS.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={enroll}
                  disabled={!enrollIdentifier.trim() || saving}
                  className="w-full py-2.5 bg-[#083262] text-white hover:bg-[#052243] rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-none cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Enroll in Ireland Jobs
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {confirmModalEl}
    </>
  );
}

// Global step-order row — grip + position + title. Candidate steps reuse the
// shared SortableStepItem (which also carries the skip toggle).
const GlobalStepRow = ({ step, index }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm"
    >
      <button
        type="button"
        className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing p-1"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-500 flex items-center justify-center shrink-0">
        {index + 1}
      </span>
      <span className="text-xs font-semibold text-[#002856] flex-1 min-w-0 truncate">
        {step.title || step.id}
      </span>
      {step.is_skippable && (
        <span className="px-1.5 py-0.5 text-[8px] font-bold rounded border uppercase tracking-wider bg-slate-50 text-slate-500 border-slate-200 shrink-0">
          Skippable
        </span>
      )}
    </div>
  );
};
