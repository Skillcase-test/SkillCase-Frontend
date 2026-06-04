import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Settings, RefreshCw } from "lucide-react";
import {
  adminGetCandidates,
  adminGetCandidateDetail,
  adminUpdateCandidate,
  adminUploadOfferLetter,
  getAdminDropdownOptions,
  adminGetSettings,
  adminUpdateSettings,
} from "../../api/jobScreeningAdminApi";
import CandidateList from "./components/CandidateList";
import CandidateDetail from "./components/CandidateDetail";

const JobScreeningAdmin = () => {
  const [candidates, setCandidates] = useState([]);
  const [options, setOptions] = useState({ interviews: [], agreements: [] });
  const [globalSettings, setGlobalSettings] = useState({
    default_interview_id: "",
    default_agreement_template_id: "",
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

  const handleUploadOfferLetter = async (userId, file) => {
    const formData = new FormData();
    formData.append("offer_letter", file);

    try {
      setUpdating(true);
      const { data } = await adminUploadOfferLetter(userId, formData);
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

  const handleUpdateSettings = async (payload) => {
    try {
      setUpdating(true);
      const { data } = await adminUpdateSettings(payload);
      if (data?.success) {
        toast.success("Global pipeline settings saved successfully");
        setGlobalSettings({
          default_interview_id: data.data.default_interview_id || "",
          default_agreement_template_id: data.data.default_agreement_template_id || "",
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
            <div className="w-full lg:w-80 shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,40,86,0.03)] p-5 flex flex-col gap-4 self-start font-sans">
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

                <button
                  type="button"
                  onClick={() => handleUpdateSettings(globalSettings)}
                  disabled={updating}
                  className="w-full py-2.5 bg-[#083262] text-white hover:bg-[#052243] rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-none mt-2"
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
