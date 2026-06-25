import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Settings, RefreshCw, X } from "lucide-react";
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
  const [candidates, setCandidates] = useState([]);
  const [options, setOptions] = useState({ interviews: [], agreements: [] });
  const [globalSettings, setGlobalSettings] = useState({
    default_interview_id: "",
    default_agreement_template_id: "",
    required_additional_documents: [],
  });
  
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [selectedCandidateDetail, setSelectedCandidateDetail] = useState(null);
  
  const [searchVal, setSearchVal] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  // Adjust viewport height to eliminate double scrollbars, only when JobScreeningAdmin is mounted
  useEffect(() => {
    const mainEl = document.querySelector("main");
    const outerEl = mainEl?.closest(".min-h-screen");

    if (mainEl && outerEl) {
      const originalMainClass = mainEl.className;
      const originalOuterClass = outerEl.className;

      mainEl.classList.remove("min-h-[calc(100vh-24px)]");
      mainEl.classList.add("h-[calc(100vh-79px)]", "lg:h-[calc(100vh-96px)]", "overflow-hidden", "flex", "flex-col");

      outerEl.classList.remove("min-h-screen");
      outerEl.classList.add("h-[calc(100vh-55px)]", "lg:h-[calc(100vh-72px)]", "overflow-hidden");

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
      const res = await adminGetCandidates(page, 10, appliedSearch);
      if (res.data?.success) {
        setCandidates(res.data.data || []);
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
  }, [page, appliedSearch]);

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
          setGlobalSettings({
            default_interview_id: resSettings.data.data.default_interview_id || "",
            default_agreement_template_id: resSettings.data.data.default_agreement_template_id || "",
            required_additional_documents: resSettings.data.data.required_additional_documents || [],
          });
        }
      } catch (err) {
        console.error("Error fetching options and settings:", err);
      }
    };
    fetchOptionsAndSettings();
  }, []);

  // Fetch details on-demand when selectedCandidateId changes
  const fetchDetail = async (userId) => {
    if (!userId) return;
    try {
      setDetailLoading(true);
      const res = await adminGetCandidateDetail(userId);
      if (res.data?.success) {
        setSelectedCandidateDetail(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching candidate detail:", err);
      toast.error("Failed to load candidate details.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCandidateId) {
      fetchDetail(selectedCandidateId);
    } else {
      setSelectedCandidateDetail(null);
    }
  }, [selectedCandidateId]);

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
        // Refetch details to ensure S3 pre-signed URLs and status evaluations are fresh
        await fetchDetail(userId);
        fetchList();
      } else {
        toast.error("Failed to update configuration");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error updating candidate configuration");
    } finally {
      setUpdating(false);
    }
  };

  const handleUploadOfferLetter = async (userId, file, recruiterAccountId) => {
    const formData = new FormData();
    formData.append("offer_letter", file);

    try {
      setUpdating(true);
      const { data } = await adminUploadOfferLetter(userId, formData, recruiterAccountId);
      if (data?.success) {
        toast.success("Offer letter uploaded successfully");
        await fetchDetail(userId);
        fetchList();
      } else {
        toast.error("Failed to upload offer letter");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error uploading offer letter PDF");
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
        await fetchDetail(userId);
        fetchList();
      } else {
        toast.error("Failed to upload training schedule image");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error uploading training schedule image");
    } finally {
      setUpdating(false);
    }
  };

  const handleUploadRecruiterScheduleImage = async (userId, file, recruiterAccountId) => {
    const formData = new FormData();
    formData.append("schedule_image", file);

    try {
      setUpdating(true);
      const { data } = await adminUploadRecruiterScheduleImage(userId, formData, recruiterAccountId);
      if (data?.success) {
        toast.success("Recruiter schedule image uploaded successfully");
        await fetchDetail(userId);
        fetchList();
      } else {
        toast.error("Failed to upload recruiter schedule image");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error uploading recruiter schedule image");
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
        setGlobalSettings({
          default_interview_id: data.data.default_interview_id || "",
          default_agreement_template_id: data.data.default_agreement_template_id || "",
          required_additional_documents: data.data.required_additional_documents || [],
        });
        fetchList();
      } else {
        toast.error("Failed to update settings");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error saving global settings");
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
    const slug = newDocTitle.toLowerCase().trim().replace(/[^a-z0-9]/g, "_");
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
      required_additional_documents: [...(prev.required_additional_documents || []), newDoc],
    }));
    setNewDocTitle("");
  };

  const handleRemoveDocRequirement = (docId) => {
    setGlobalSettings((prev) => ({
      ...prev,
      required_additional_documents: (prev.required_additional_documents || []).filter((d) => d.id !== docId),
    }));
  };

  return (
    <div className="flex flex-col gap-6 h-full font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-[#083262]">Job Screening Admin</h1>
          <p className="text-xs text-slate-500 mt-1">Manage B1/B2 candidate profiles, slot times, and step orderings.</p>
        </div>
        {!selectedCandidateId && (
          <button
            type="button"
            onClick={fetchList}
            disabled={listLoading}
            className="p-2 hover:bg-slate-50 border border-slate-150 rounded-xl text-slate-500 hover:text-slate-700 transition-all flex items-center gap-1.5 text-[11px] font-bold disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${listLoading ? "animate-spin" : ""}`}
            />
            Refresh List
          </button>
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
              setSelectedCandidateId(null);
              setSelectedCandidateDetail(null);
            }}
          />
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
            {/* Left Column: Candidate List */}
            <div className="flex-1 min-h-0 h-full">
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
              />
            </div>

            {/* Right Column: Global Pipeline Settings panel */}
            <div className="w-full lg:w-80 shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,40,86,0.03)] p-5 flex flex-col gap-4 self-start font-sans max-h-[calc(100vh-100px)] overflow-y-auto">
              <div>
                <h3 className="text-sm font-extrabold text-[#083262]">Global Pipeline Defaults</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-relaxed">
                  Set default interview/agreement templates used for all candidates when no custom overrides exist.
                </p>
              </div>

              <div className="h-px bg-slate-100/80" />

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
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

                <div className="flex flex-col gap-1">
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

                <div className="h-px bg-slate-100/80 my-1" />

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Global Supporting Documents
                  </label>
                  
                  {/* List of existing requirements */}
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {(globalSettings.required_additional_documents || []).length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">No global documents required.</p>
                    ) : (
                      globalSettings.required_additional_documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-2 text-[10px]">
                          <div className="truncate pr-2 text-left">
                            <span className="font-bold text-slate-700 block truncate">{doc.title}</span>
                            <span className="text-[8px] text-slate-400 font-medium">
                              Formats: {doc.allowed_extensions?.join(", ").toUpperCase()}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocRequirement(doc.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Form to add a new requirement */}
                  <div className="mt-2 p-2.5 bg-slate-50/50 border border-slate-150 rounded-xl flex flex-col gap-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Add Document</span>
                    <input
                      type="text"
                      placeholder="e.g. 10th Marks Card"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-[#083262]"
                    />
                    
                    {/* Checkboxes for file types */}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Object.keys(newDocExts).map((ext) => (
                        <label key={ext} className="flex items-center gap-1 text-[9px] font-bold text-slate-500 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={newDocExts[ext]}
                            onChange={(e) => setNewDocExts(prev => ({ ...prev, [ext]: e.target.checked }))}
                            className="rounded border-slate-200 text-[#083262] focus:ring-0 w-3 h-3"
                          />
                          {ext.toUpperCase()}
                        </label>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddDocRequirement}
                      className="w-full py-1.5 bg-[#083262] hover:bg-[#052243] text-white font-bold text-[9px] rounded-lg transition-all mt-1 cursor-pointer"
                    >
                      Add to Checklist
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleUpdateSettings(globalSettings)}
                  disabled={updating}
                  className="w-full py-2.5 bg-[#083262] text-white hover:bg-[#052243] rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-none mt-2 cursor-pointer"
                >
                  Save Global Defaults
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobScreeningAdmin;
