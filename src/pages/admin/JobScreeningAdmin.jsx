import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  Settings,
  RefreshCw,
  X,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  adminGetCandidates,
  adminGetCandidateDetail,
  adminUpdateCandidate,
  adminUploadOfferLetter,
  getAdminDropdownOptions,
  adminGetSettings,
  adminUpdateSettings,
  adminUploadTrainingScheduleImage,
  adminUploadRecruiterScheduleImage,
} from "../../api/jobScreeningAdminApi";
import CandidateList from "./components/CandidateList";
import CandidateDetail from "./components/CandidateDetail";

const JobScreeningAdmin = () => {
  const detailRequestIdRef = React.useRef(0);
  const [candidates, setCandidates] = useState([]);
  const [options, setOptions] = useState({
    interviews: [],
    agreements: [],
    recruiters: [],
  });
  const [globalSettings, setGlobalSettings] = useState({
    default_interview_id: "",
    default_agreement_template_id: "",
    required_additional_documents: [],
    default_recruiter_id: "",
    default_job_title: "",
    default_job_location: "",
    default_job_salary_range: "",
    default_job_type: "",
    default_job_description: "",
    steps_config: [],
  });

  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [selectedCandidateDetail, setSelectedCandidateDetail] = useState(null);
  const [activeTab, setActiveTab] = useState("candidates");

  const [searchVal, setSearchVal] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("total");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [summary, setSummary] = useState({
    total_users: 0,
    initiated: 0,
    profile_updated: 0,
    interview_completed: 0,
    actions_pending: 0,
    active_candidates: 0,
    inactive_candidates: 0,
  });

  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEndGlobal = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const steps = globalSettings.steps_config || [];
      const oldIndex = steps.findIndex((s) => s.id === active.id);
      const newIndex = steps.findIndex((s) => s.id === over.id);
      const updatedSteps = arrayMove(steps, oldIndex, newIndex);
      setGlobalSettings((prev) => ({
        ...prev,
        steps_config: updatedSteps,
      }));
    }
  };

  // Adjust viewport height to eliminate double scrollbars, only when JobScreeningAdmin is mounted
  useEffect(() => {
    const mainEl = document.querySelector("main");
    const outerEl = mainEl?.closest(".min-h-screen");

    if (mainEl && outerEl) {
      const originalMainClass = mainEl.className;
      const originalOuterClass = outerEl.className;

      mainEl.classList.remove("min-h-[calc(100vh-24px)]");
      mainEl.classList.add(
        "h-[calc(100vh-79px)]",
        "lg:h-[calc(100vh-96px)]",
        "overflow-hidden",
        "flex",
        "flex-col",
      );

      outerEl.classList.remove("min-h-screen");
      outerEl.classList.add(
        "h-[calc(100vh-55px)]",
        "lg:h-[calc(100vh-72px)]",
        "overflow-hidden",
      );

      return () => {
        mainEl.className = originalMainClass;
        outerEl.className = originalOuterClass;
      };
    }
  }, []);

  // Debounce search input changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setAppliedSearch(searchVal);
      setPage(1);
    }, 450);
    return () => clearTimeout(delayDebounce);
  }, [searchVal]);

  // Fetch candidate list when page or applied search changes
  const fetchList = async () => {
    try {
      setListLoading(true);
      setError("");
      const res = await adminGetCandidates(
        page,
        10,
        appliedSearch,
        statusFilter,
        startDate,
        endDate,
      );
      if (res.data?.success) {
        setCandidates(res.data.data || []);
        setSummary((prev) => ({ ...prev, ...(res.data.summary || {}) }));
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
        }
      }
    } catch (err) {
      console.error("Error fetching candidates:", err);
      setError("Failed to retrieve candidate listings.");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [page, appliedSearch, statusFilter, startDate, endDate]);

  const handleSummaryFilter = (filter) => {
    setStatusFilter(filter);
    setPage(1);
  };

  // Fetch dropdown options and settings once on mount
  useEffect(() => {
    const fetchOptionsAndSettings = async () => {
      try {
        const resOptions = await getAdminDropdownOptions();
        if (resOptions.data?.success) {
          setOptions(resOptions.data);
        }
        const resSettings = await adminGetSettings();
        if (resSettings.data?.success) {
          const settings = resSettings.data.data || {};
          setGlobalSettings({
            default_interview_id: settings.default_interview_id || "",
            default_agreement_template_id:
              settings.default_agreement_template_id || "",
            required_additional_documents:
              settings.required_additional_documents || [],
            default_recruiter_id: settings.default_recruiter_id || "",
            default_job_title: settings.default_job_title || "",
            default_job_location: settings.default_job_location || "",
            default_job_salary_range: settings.default_job_salary_range || "",
            default_job_type: settings.default_job_type || "",
            default_job_description: settings.default_job_description || "",
            steps_config: settings.steps_config || [],
            paywall_enabled: settings.paywall_enabled || false,
          });
        }
      } catch (err) {
        console.error("Error fetching options and settings:", err);
      }
    };
    fetchOptionsAndSettings();
  }, []);

  // Parse URL search params to open candidate details on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id") || params.get("candidateId");
    if (idParam) {
      setSelectedCandidateId(idParam);
    }
  }, []);

  // Fetch details on-demand when selectedCandidateId changes
  const syncCandidateListRow = (candidateData) => {
    if (!candidateData?.user_id) return;
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.user_id === candidateData.user_id
          ? {
              ...candidate,
              fullname: candidateData.fullname,
              email: candidateData.email,
              number: candidateData.number,
              language_level: candidateData.language_level,
              current_profeciency_level:
                candidateData.current_profeciency_level,
              current_step_id: candidateData.current_step_id,
              steps_config: candidateData.steps_config,
              email_verified: candidateData.email_verified,
              is_active: candidateData.is_active,
              inactive_by: candidateData.inactive_by,
              inactive_at: candidateData.inactive_at,
            }
          : candidate,
      ),
    );
  };

  const fetchDetail = async (userId, { silent = false } = {}) => {
    if (!userId) return;
    const requestId = ++detailRequestIdRef.current;
    try {
      if (!silent) setDetailLoading(true);
      const res = await adminGetCandidateDetail(userId);
      if (res.data?.success && requestId === detailRequestIdRef.current) {
        setSelectedCandidateDetail(res.data.data);
        syncCandidateListRow(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching candidate detail:", err);
      if (!silent) toast.error("Failed to load candidate details.");
    } finally {
      if (!silent && requestId === detailRequestIdRef.current) {
        setDetailLoading(false);
      }
    }
  };

  useEffect(() => {
    if (selectedCandidateId) {
      fetchDetail(selectedCandidateId);
    } else {
      setSelectedCandidateDetail(null);
    }
  }, [selectedCandidateId]);

  useEffect(() => {
    if (!selectedCandidateId || updating) return undefined;

    const refreshSelectedCandidate = () => {
      fetchDetail(selectedCandidateId, { silent: true });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshSelectedCandidate();
      }
    };

    const intervalId = window.setInterval(refreshSelectedCandidate, 8000);
    window.addEventListener("focus", refreshSelectedCandidate);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshSelectedCandidate);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [selectedCandidateId, updating]);

  const applyUpdatedCandidate = (candidateData) => {
    if (!candidateData) return;
    // Invalidate any older background detail request before applying the
    // authoritative response returned by the mutation.
    detailRequestIdRef.current += 1;
    const normalizedCandidateData = {
      ...selectedCandidateDetail,
      ...candidateData,
      fullname:
        candidateData.fullname ??
        candidateData.candidate_name ??
        selectedCandidateDetail?.fullname ??
        "",
      email:
        candidateData.email ??
        candidateData.candidate_email ??
        selectedCandidateDetail?.email ??
        "",
      number:
        candidateData.number ??
        selectedCandidateDetail?.number ??
        candidateData.candidate_phone ??
        "",
    };
    setSelectedCandidateDetail(normalizedCandidateData);
    setDetailLoading(false);
    syncCandidateListRow(normalizedCandidateData);
  };

  const handleRefreshDetail = () => {
    if (selectedCandidateId) {
      fetchDetail(selectedCandidateId);
      fetchList();
    }
  };

  const handleUpdateCandidate = async (userId, payload) => {
    try {
      setUpdating(true);
      const { data } = await adminUpdateCandidate(userId, payload);
      if (data?.success) {
        toast.success("Candidate configuration saved successfully");
        applyUpdatedCandidate(data.data);
        fetchList();
      } else {
        toast.error("Failed to update configuration");
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Error updating candidate configuration",
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleUploadOfferLetter = async (userId, file, recruiterAccountId) => {
    const formData = new FormData();
    formData.append("offer_letter", file);

    try {
      setUpdating(true);
      const { data } = await adminUploadOfferLetter(
        userId,
        formData,
        recruiterAccountId,
      );
      if (data?.success) {
        toast.success("Offer letter uploaded successfully");
        applyUpdatedCandidate(data.data);
        fetchList();
      } else {
        toast.error("Failed to upload offer letter");
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Error uploading offer letter PDF",
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleUploadTrainingScheduleImage = async (userId, file) => {
    const formData = new FormData();
    formData.append("schedule_image", file);

    try {
      setUpdating(true);
      const { data } = await adminUploadTrainingScheduleImage(userId, formData);
      if (data?.success) {
        toast.success("Training schedule image uploaded successfully");
        applyUpdatedCandidate(data.data);
        fetchList();
      } else {
        toast.error("Failed to upload training schedule image");
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          "Error uploading training schedule image",
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleUploadRecruiterScheduleImage = async (
    userId,
    file,
    recruiterAccountId,
  ) => {
    const formData = new FormData();
    formData.append("schedule_image", file);

    try {
      setUpdating(true);
      const { data } = await adminUploadRecruiterScheduleImage(
        userId,
        formData,
        recruiterAccountId,
      );
      if (data?.success) {
        toast.success("Recruiter schedule image uploaded successfully");
        applyUpdatedCandidate(data.data);
        fetchList();
      } else {
        toast.error("Failed to upload recruiter schedule image");
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          "Error uploading recruiter schedule image",
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateSettings = async (payload) => {
    try {
      setUpdating(true);
      const { data } = await adminUpdateSettings(payload);
      if (data?.success) {
        toast.success("Global pipeline settings saved successfully");
        const settings = data.data || {};
        setGlobalSettings({
          default_interview_id: settings.default_interview_id || "",
          default_agreement_template_id:
            settings.default_agreement_template_id || "",
          required_additional_documents:
            settings.required_additional_documents || [],
          default_recruiter_id: settings.default_recruiter_id || "",
          default_job_title: settings.default_job_title || "",
          default_job_location: settings.default_job_location || "",
          default_job_salary_range: settings.default_job_salary_range || "",
          default_job_type: settings.default_job_type || "",
          default_job_description: settings.default_job_description || "",
          steps_config: settings.steps_config || [],
          paywall_enabled: settings.paywall_enabled || false,
        });
        fetchList();
      } else {
        toast.error("Failed to update settings");
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Error saving global settings",
      );
    } finally {
      setUpdating(false);
    }
  };

  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocExts, setNewDocExts] = useState({
    pdf: true,
    doc: true,
    docx: true,
    png: true,
    jpg: true,
    jpeg: true,
  });

  const handleAddDocRequirement = () => {
    if (!newDocTitle.trim()) {
      toast.error("Document title cannot be empty");
      return;
    }
    const slug = newDocTitle
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "_");
    const docId = `doc_${slug}_${Date.now()}`;
    const selectedExts = Object.keys(newDocExts).filter((k) => newDocExts[k]);
    if (selectedExts.length === 0) {
      toast.error("Please select at least one allowed file type");
      return;
    }

    const newDoc = {
      id: docId,
      title: newDocTitle.trim(),
      allowed_extensions: selectedExts,
      description: `Please upload a clear copy of your ${newDocTitle.trim()}.`,
    };

    setGlobalSettings((prev) => ({
      ...prev,
      required_additional_documents: [
        ...(prev.required_additional_documents || []),
        newDoc,
      ],
    }));
    setNewDocTitle("");
  };

  const handleRemoveDocRequirement = (docId) => {
    setGlobalSettings((prev) => ({
      ...prev,
      required_additional_documents: (
        prev.required_additional_documents || []
      ).filter((d) => d.id !== docId),
    }));
  };

  return (
    <div className="flex flex-col gap-6 h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#083262]">
            Job Screening Admin
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage B1/B2 candidate profiles, slot times, and step orderings.
          </p>
        </div>

        {!selectedCandidateId && (
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40">
              <button
                type="button"
                onClick={() => setActiveTab("candidates")}
                className={`px-4 py-1.5 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                  activeTab === "candidates"
                    ? "bg-[#083262] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Candidates List
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`px-4 py-1.5 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                  activeTab === "settings"
                    ? "bg-[#083262] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Global Settings
              </button>
            </div>

            {activeTab === "candidates" && (
              <button
                type="button"
                onClick={fetchList}
                disabled={listLoading}
                className="p-2 hover:bg-slate-50 border border-slate-150 rounded-xl text-slate-500 hover:text-slate-700 transition-all flex items-center gap-1.5 text-[11px] font-bold disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${listLoading ? "animate-spin" : ""}`}
                />
                Refresh List
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-100 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0">
        {selectedCandidateId ? (
          <CandidateDetail
            candidate={selectedCandidateDetail}
            loading={detailLoading}
            options={options}
            onUpdate={handleUpdateCandidate}
            onUploadOfferLetter={handleUploadOfferLetter}
            onUploadTrainingScheduleImage={handleUploadTrainingScheduleImage}
            onUploadRecruiterScheduleImage={handleUploadRecruiterScheduleImage}
            updating={updating}
            onRefresh={handleRefreshDetail}
            onClose={() => {
              detailRequestIdRef.current += 1;
              setSelectedCandidateId(null);
              setSelectedCandidateDetail(null);
              setDetailLoading(false);
              fetchList();
            }}
          />
        ) : activeTab === "candidates" ? (
          <div className="h-full min-h-0 flex flex-col gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2 shrink-0">
              {[
                {
                  key: "total",
                  label: "Total Users",
                  value: summary.total_users,
                  tone:
                    "border-slate-200 bg-white text-slate-900 hover:border-slate-300",
                },
                {
                  key: "initiated",
                  label: "Initiated",
                  value: summary.initiated,
                  tone:
                    "border-purple-200 bg-purple-50 text-purple-900 hover:border-purple-300",
                },
                {
                  key: "profile_updated",
                  label: "Profile Updated",
                  value: summary.profile_updated,
                  tone:
                    "border-cyan-200 bg-cyan-50 text-cyan-900 hover:border-cyan-300",
                },
                {
                  key: "interview_completed",
                  label: "Interview Completed",
                  value: summary.interview_completed,
                  tone:
                    "border-blue-200 bg-blue-50 text-blue-900 hover:border-blue-300",
                },
                {
                  key: "actions_pending",
                  label: "Actions Pending",
                  value: summary.actions_pending,
                  tone:
                    "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300",
                },
                {
                  key: "active_candidates",
                  label: "Active Candidates",
                  value: summary.active_candidates,
                  tone:
                    "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300",
                },
                {
                  key: "inactive_candidates",
                  label: "Inactive Candidates",
                  value: summary.inactive_candidates,
                  tone:
                    "border-rose-200 bg-rose-50 text-rose-900 hover:border-rose-300",
                },
              ].map((item) => {
                const isActive = statusFilter === item.key;
                return (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() => handleSummaryFilter(item.key)}
                    aria-pressed={isActive}
                    title={`Filter by ${item.label}`}
                    className={`relative flex min-w-0 flex-col justify-between rounded-xl border px-3 py-2.5 text-left shadow-sm transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${item.tone} ${
                      isActive
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
                          isActive
                            ? "bg-current shadow-[0_0_0_3px_rgba(255,255,255,0.75)]"
                            : "bg-current opacity-20"
                        }`}
                      />
                    </div>
                    <span className="mt-1 block text-lg font-bold leading-none tabular-nums">
                      {Number(item.value) || 0}
                    </span>
                    <span className="mt-1 text-[8px] font-medium opacity-60">
                      {isActive ? "Showing candidates" : "Click to filter"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex-1 min-h-0">
              <CandidateList
                candidates={candidates}
                selectedCandidateId={selectedCandidateId}
                onSelectCandidate={(id) => setSelectedCandidateId(id)}
                searchVal={searchVal}
                setSearchVal={setSearchVal}
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                loading={listLoading}
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={(value) => {
                  setStartDate(value);
                  setPage(1);
                }}
                onEndDateChange={(value) => {
                  setEndDate(value);
                  setPage(1);
                }}
                onClearDates={() => {
                  setStartDate("");
                  setEndDate("");
                  setPage(1);
                }}
              />
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto pr-1 pb-10">
            {/* Header & Save Action */}
            <div className="flex justify-between items-center mb-6 bg-slate-50 p-4 border border-slate-200/60 rounded-2xl">
              <div className="text-left">
                <h3 className="text-sm font-extrabold text-[#083262]">
                  Global Pipeline Defaults
                </h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-relaxed">
                  Define default template configurations, customize pipeline
                  step sequences, and manage required document checklists.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateSettings(globalSettings)}
                disabled={updating}
                className="px-6 py-2.5 bg-[#083262] text-white hover:bg-[#052243] rounded-xl text-xs font-extrabold transition-all disabled:opacity-50 shadow-sm cursor-pointer shrink-0"
              >
                {updating ? "Saving Defaults..." : "Save Global Defaults"}
              </button>
            </div>

            {/* Grid of 3 spacious cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Card 1: Default Templates & Job Info */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,40,86,0.03)] p-5 flex flex-col gap-4">
                <span className="text-[10px] font-bold text-[#083262] uppercase tracking-wider block text-left border-b border-slate-100 pb-2">
                  General Defaults
                </span>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Default Interview Template
                    </label>
                    <div className="relative">
                      <select
                        value={globalSettings.default_interview_id}
                        onChange={(e) =>
                          setGlobalSettings((prev) => ({
                            ...prev,
                            default_interview_id: e.target.value,
                          }))
                        }
                        className="w-full border border-slate-200 rounded-xl p-2.5 pr-8 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] shadow-none transition-all appearance-none"
                      >
                        <option value="">No Default Interview</option>
                        {options.interviews?.map((int) => (
                          <option key={int.position_id} value={int.position_id}>
                            {int.title}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                        <Settings className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Default Agreement Template
                    </label>
                    <div className="relative">
                      <select
                        value={globalSettings.default_agreement_template_id}
                        onChange={(e) =>
                          setGlobalSettings((prev) => ({
                            ...prev,
                            default_agreement_template_id: e.target.value,
                          }))
                        }
                        className="w-full border border-slate-200 rounded-xl p-2.5 pr-8 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] shadow-none transition-all appearance-none"
                      >
                        <option value="">No Default Agreement</option>
                        {options.agreements?.map((agr) => (
                          <option key={agr.template_id} value={agr.template_id}>
                            {agr.title}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                        <Settings className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Default Recruiter Partner
                    </label>
                    <div className="relative">
                      <select
                        value={globalSettings.default_recruiter_id}
                        onChange={(e) =>
                          setGlobalSettings((prev) => ({
                            ...prev,
                            default_recruiter_id: e.target.value,
                          }))
                        }
                        className="w-full border border-slate-200 rounded-xl p-2.5 pr-8 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] shadow-none transition-all appearance-none"
                      >
                        <option value="">No Default Recruiter</option>
                        {options.recruiters?.map((rec) => (
                          <option key={rec.id} value={rec.id}>
                            {rec.email}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                        <Settings className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100/80 my-1" />

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Default Job Title
                    </label>
                    <input
                      type="text"
                      value={globalSettings.default_job_title || ""}
                      onChange={(e) =>
                        setGlobalSettings((prev) => ({
                          ...prev,
                          default_job_title: e.target.value,
                        }))
                      }
                      placeholder="e.g. Registered ICU Nurse"
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Default Job Location
                    </label>
                    <input
                      type="text"
                      value={globalSettings.default_job_location || ""}
                      onChange={(e) =>
                        setGlobalSettings((prev) => ({
                          ...prev,
                          default_job_location: e.target.value,
                        }))
                      }
                      placeholder="e.g. Frankfurt, Germany"
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Default Salary Range
                    </label>
                    <input
                      type="text"
                      value={globalSettings.default_job_salary_range || ""}
                      onChange={(e) =>
                        setGlobalSettings((prev) => ({
                          ...prev,
                          default_job_salary_range: e.target.value,
                        }))
                      }
                      placeholder="e.g. €50,000 - €70,000 / year"
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Default Job Type
                    </label>
                    <input
                      type="text"
                      value={globalSettings.default_job_type || ""}
                      onChange={(e) =>
                        setGlobalSettings((prev) => ({
                          ...prev,
                          default_job_type: e.target.value,
                        }))
                      }
                      placeholder="e.g. Full-time"
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Default Job Description
                    </label>
                    <textarea
                      value={globalSettings.default_job_description || ""}
                      onChange={(e) =>
                        setGlobalSettings((prev) => ({
                          ...prev,
                          default_job_description: e.target.value,
                        }))
                      }
                      placeholder="Enter default job description..."
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] transition-all resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="text-xs font-semibold text-slate-800">
                        Global Paywall Enabled
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Require candidates to pay 10000 INR deposit
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={globalSettings.paywall_enabled || false}
                        onChange={(e) =>
                          setGlobalSettings((prev) => ({
                            ...prev,
                            paywall_enabled: e.target.checked,
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#002856]"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Card 2: Steps Configurator (DnD) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,40,86,0.03)] p-5 flex flex-col gap-4">
                <span className="text-[10px] font-bold text-[#083262] uppercase tracking-wider block text-left border-b border-slate-100 pb-2">
                  Pipeline Steps Order & Settings
                </span>

                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Global Pipeline Steps
                  </label>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-2">
                    Drag handles to reorder default workflow sequence. Toggle
                    whether a step can be skipped by default.
                  </p>

                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEndGlobal}
                    >
                      <SortableContext
                        items={(globalSettings.steps_config || []).map(
                          (s) => s.id,
                        )}
                        strategy={verticalListSortingStrategy}
                      >
                        {(globalSettings.steps_config || []).map(
                          (step, idx) => (
                            <SortableGlobalStepItem
                              key={step.id}
                              id={step.id}
                              step={step}
                              index={idx}
                              onToggleSkippable={(stepId, isChecked) => {
                                const updatedSteps = (
                                  globalSettings.steps_config || []
                                ).map((s) => {
                                  if (s.id === stepId) {
                                    return { ...s, is_skippable: isChecked };
                                  }
                                  return s;
                                });
                                setGlobalSettings((prev) => ({
                                  ...prev,
                                  steps_config: updatedSteps,
                                }));
                              }}
                              onUpdateButtonTitle={(stepId, newTitle) => {
                                const updatedSteps = (
                                  globalSettings.steps_config || []
                                ).map((s) => {
                                  if (s.id === stepId) {
                                    return { ...s, button_title: newTitle };
                                  }
                                  return s;
                                });
                                setGlobalSettings((prev) => ({
                                  ...prev,
                                  steps_config: updatedSteps,
                                }));
                              }}
                            />
                          ),
                        )}
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>
              </div>

              {/* Card 3: Checklist Requirements */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,40,86,0.03)] p-5 flex flex-col gap-4">
                <span className="text-[10px] font-bold text-[#083262] uppercase tracking-wider block text-left border-b border-slate-100 pb-2">
                  Checklist & Documents
                </span>

                <div className="flex flex-col gap-4 text-left">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Global Supporting Documents
                    </label>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-1">
                      Candidates must upload these checklist documents under the
                      "Additional Documents" pipeline step.
                    </p>

                    {/* List of existing requirements */}
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {(globalSettings.required_additional_documents || [])
                        .length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic">
                          No global documents required.
                        </p>
                      ) : (
                        globalSettings.required_additional_documents.map(
                          (doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-2 text-[10px]"
                            >
                              <div className="truncate pr-2 text-left">
                                <span className="font-bold text-slate-700 block truncate">
                                  {doc.title}
                                </span>
                                <span className="text-[8px] text-slate-400 font-medium">
                                  Formats:{" "}
                                  {doc.allowed_extensions
                                    ?.join(", ")
                                    .toUpperCase()}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveDocRequirement(doc.id)
                                }
                                className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ),
                        )
                      )}
                    </div>
                  </div>

                  {/* Form to add a new requirement */}
                  <div className="p-3 bg-slate-50/50 border border-slate-150 rounded-xl flex flex-col gap-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">
                      Add Global Document Requirement
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. 10th Marks Card"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-[#083262]"
                    />

                    {/* Checkboxes for file types */}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Object.keys(newDocExts).map((ext) => (
                        <label
                          key={ext}
                          className="flex items-center gap-1 text-[9px] font-bold text-slate-500 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={newDocExts[ext]}
                            onChange={(e) =>
                              setNewDocExts((prev) => ({
                                ...prev,
                                [ext]: e.target.checked,
                              }))
                            }
                            className="rounded border-slate-200 text-[#083262] focus:ring-0 w-3 h-3"
                          />
                          {ext.toUpperCase()}
                        </label>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddDocRequirement}
                      className="w-full py-2 bg-[#083262] hover:bg-[#052243] text-white font-bold text-[9px] rounded-lg transition-all mt-1 cursor-pointer"
                    >
                      Add to Checklist
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SortableGlobalStepItem = ({
  id,
  step,
  index,
  onToggleSkippable,
  onUpdateButtonTitle,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-2.5 bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[10px]"
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 text-left min-w-0">
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing p-1 shrink-0"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <div className="flex flex-col truncate">
            <span className="font-bold text-slate-700 truncate">
              {step.title}
            </span>
            <span className="text-[8px] text-slate-400 font-semibold uppercase mt-0.5">
              Step {index + 1}
            </span>
          </div>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
          <input
            type="checkbox"
            checked={!!step.is_skippable}
            onChange={(e) => onToggleSkippable(step.id, e.target.checked)}
            className="rounded border-slate-200 text-[#083262] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
          />
          <span className="text-[9px] font-bold text-slate-500">Skippable</span>
        </label>
      </div>

      <div className="flex items-center gap-2 pl-7 w-full">
        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
          Button Title
        </span>
        <input
          type="text"
          value={step.button_title || ""}
          onChange={(e) => onUpdateButtonTitle(step.id, e.target.value)}
          placeholder="e.g. Start this step"
          className="flex-1 border border-slate-200 rounded-md px-2 py-1 text-[10px] bg-white focus:outline-none focus:border-[#083262]"
        />
      </div>
    </div>
  );
};

export default JobScreeningAdmin;
