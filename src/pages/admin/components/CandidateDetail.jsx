import React, { useState, useEffect } from "react";
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
} from "@dnd-kit/sortable";
import {
  Check,
  Upload,
  FileText,
  Calendar,
  Video,
  ArrowLeft,
  AlertCircle,
  Award,
  CheckCircle2,
  Trash2,
  RefreshCw,
  X,
  ExternalLink,
  ChevronDown,
  User,
  Settings,
  Mail,
  Phone,
  CalendarDays,
} from "lucide-react";
import SortableStepItem from "./SortableStepItem";
import { toast } from "react-hot-toast";

const formatToLocalDateTimeString = (dateInput) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const CandidateDetail = ({
  candidate,
  loading,
  options,
  onUpdate,
  onUploadOfferLetter,
  updating,
  onRefresh,
  onClose,
}) => {
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [number, setNumber] = useState("");
  const [proficiency, setProficiency] = useState("");

  const [interviewId, setInterviewId] = useState("");
  const [agreementId, setAgreementId] = useState("");

  const [trainingTime, setTrainingTime] = useState("");
  const [trainingMeet, setTrainingMeet] = useState("");

  const [recruiterTime, setRecruiterTime] = useState("");
  const [recruiterMeet, setRecruiterMeet] = useState("");

  const [steps, setSteps] = useState([]);

  const [candDocTitle, setCandDocTitle] = useState("");
  const [candDocExts, setCandDocExts] = useState({
    pdf: true,
    doc: true,
    docx: true,
    png: true,
    jpg: true,
    jpeg: true,
  });

  const handleAddCandDocOverride = (e) => {
    e.preventDefault();
    if (!candDocTitle.trim()) {
      toast.error("Document title cannot be empty");
      return;
    }
    const slug = candDocTitle.toLowerCase().trim().replace(/[^a-z0-9]/g, "_");
    const docId = `doc_${slug}_${Date.now()}`;
    const selectedExts = Object.keys(candDocExts).filter((k) => candDocExts[k]);
    if (selectedExts.length === 0) {
      toast.error("Please select at least one allowed file type");
      return;
    }

    const newDoc = {
      id: docId,
      title: candDocTitle.trim(),
      allowed_extensions: selectedExts,
      description: `Please upload a clear copy of your ${candDocTitle.trim()}.`,
    };

    const currentList = candidate.candidate_required_additional_documents !== null
      ? (candidate.candidate_required_additional_documents || [])
      : (candidate.globalSettings?.required_additional_documents || []);

    const updatedList = [...currentList, newDoc];
    onUpdate(candidate.user_id, { candidate_required_additional_documents: updatedList });
    setCandDocTitle("");
  };

  const handleRemoveCandDocOverride = (docId) => {
    const currentList = candidate.candidate_required_additional_documents !== null
      ? (candidate.candidate_required_additional_documents || [])
      : (candidate.globalSettings?.required_additional_documents || []);

    const updatedList = currentList.filter((d) => d.id !== docId);
    onUpdate(candidate.user_id, { candidate_required_additional_documents: updatedList });
  };

  const handleResetCandChecklist = () => {
    openConfirmModal({
      title: "Reset Checklist to Global Defaults?",
      message: "This will discard all custom document requirements configured for this candidate and revert to the global pipeline defaults.",
      onConfirm: () => {
        onUpdate(candidate.user_id, { candidate_required_additional_documents: "clear" });
      }
    });
  };

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const openConfirmModal = ({ title, message, onConfirm }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: null,
    });
  };

  // Bind values from candidate details when candidate loads/updates
  useEffect(() => {
    if (candidate) {
      setFullname(candidate.fullname || "");
      setEmail(candidate.email || candidate.extracted_email || "");
      setNumber(candidate.number || "");
      setProficiency(candidate.language_level || candidate.current_profeciency_level || "");

      setInterviewId(candidate.assigned_interview_id || "");
      setAgreementId(candidate.assigned_agreement_template_id || "");

      setTrainingTime(
        candidate.training_slot_time
          ? formatToLocalDateTimeString(candidate.training_slot_time)
          : "",
      );
      setTrainingMeet(candidate.training_meet_link || "");

      setRecruiterTime(
        candidate.recruiter_slot_time
          ? formatToLocalDateTimeString(candidate.recruiter_slot_time)
          : "",
      );
      setRecruiterMeet(candidate.recruiter_meet_link || "");

      setSteps(candidate.steps_config || []);
    }
  }, [candidate]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (loading && !candidate) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-[#083262] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 mt-3 font-semibold">
          Loading screening details...
        </p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-slate-400 text-sm font-medium">
        Select a candidate from the list to manage their screening pipeline
      </div>
    );
  }

  const handleSaveProfileInfo = (e) => {
    e.preventDefault();
    onUpdate(candidate.user_id, {
      fullname,
      email,
      number,
      current_profeciency_level: proficiency,
    });
  };

  const handleUpdateInterviewAssignment = (e) => {
    e.preventDefault();
    onUpdate(candidate.user_id, {
      assigned_interview_id: interviewId ? parseInt(interviewId) : null,
    });
  };

  const handleUpdateAgreementAssignment = (e) => {
    e.preventDefault();
    onUpdate(candidate.user_id, {
      assigned_agreement_template_id: agreementId || null,
    });
  };

  const handleSaveTrainingSchedule = (e) => {
    e.preventDefault();
    onUpdate(candidate.user_id, {
      training_slot_time: trainingTime
        ? new Date(trainingTime).toISOString()
        : null,
      training_meet_link: trainingMeet,
    });
  };

  const handleSaveRecruiterSchedule = (e) => {
    e.preventDefault();
    onUpdate(candidate.user_id, {
      recruiter_slot_time: recruiterTime
        ? new Date(recruiterTime).toISOString()
        : null,
      recruiter_meet_link: recruiterMeet,
    });
  };

  const handleVerifyEmail = () => {
    onUpdate(candidate.user_id, { email_verified: true });
  };

  const handleRejectProfile = () => {
    openConfirmModal({
      title: "Reject Profile Documents?",
      message:
        "This will mark the profile as unverified and permanently clear the candidate's uploaded resume and language certificate PDFs from storage. The candidate will need to re-upload their files.",
      onConfirm: () => {
        onUpdate(candidate.user_id, {
          resume_url: "clear",
          lang_cert_url: "clear",
          email_verified: false,
        });
      },
    });
  };

  const handleResetWelcome = () => {
    openConfirmModal({
      title: "Reset Welcome Checkpoint?",
      message:
        "This will reset the welcome step status back to pending. The candidate will need to start the pipeline again.",
      onConfirm: () => {
        const updatedSteps = steps.map((s) => {
          if (s.id === "welcome") return { ...s, status: "pending" };
          return { ...s, status: "locked" };
        });
        onUpdate(candidate.user_id, { steps_config: updatedSteps });
      },
    });
  };

  const handleResetProfile = () => {
    openConfirmModal({
      title: "Reset Profile Verification?",
      message:
        "This will mark the candidate's profile verification status as pending review. They will need to be approved again.",
      onConfirm: () => {
        onUpdate(candidate.user_id, { email_verified: false });
      },
    });
  };

  const handleResetInterview = () => {
    openConfirmModal({
      title: "Reset Skillcase Interview?",
      message:
        "This will permanently delete the candidate's assigned interview and their submitted video/audio attempt. This action cannot be undone.",
      onConfirm: () => {
        const updatedSteps = steps.map((s) => {
          if (s.id === "interview_attempt") return { ...s, status: "pending" };
          return s;
        });
        onUpdate(candidate.user_id, {
          steps_config: updatedSteps,
          reset_interview: true,
        });
      },
    });
  };

  const handleResetAgreement = () => {
    openConfirmModal({
      title: "Reset Registration Checkpoint?",
      message:
        "This will delete the candidate's signed agreement envelope and signature log history. They will be required to sign the terms registration again.",
      onConfirm: () => {
        const updatedSteps = steps.map((s) => {
          if (s.id === "registration_form") return { ...s, status: "pending" };
          return s;
        });
        onUpdate(candidate.user_id, {
          steps_config: updatedSteps,
          reset_agreement: true,
        });
      },
    });
  };

  const handlePassReview = () => {
    onUpdate(candidate.user_id, { overall_review_status: "shortlisted" });
  };

  const handleFailReview = () => {
    onUpdate(candidate.user_id, { overall_review_status: "rejected" });
  };

  const handlePassTraining = () => {
    onUpdate(candidate.user_id, { training_completed: true });
  };

  const handleFailTraining = () => {
    openConfirmModal({
      title: "Fail Interview Training?",
      message:
        "This will mark the candidate as failed/rejected for the Interview Training checkpoint. The scheduled slot details will be preserved.",
      onConfirm: () => {
        onUpdate(candidate.user_id, {
          training_completed: false,
        });
      },
    });
  };

  const handleResetTraining = () => {
    openConfirmModal({
      title: "Reset Training Checkpoint?",
      message:
        "This will mark the mentoring/training step as incomplete and clear the slot timing and meet link.",
      onConfirm: () => {
        onUpdate(candidate.user_id, { reset_training: true });
      },
    });
  };

  const handlePassRecruiter = () => {
    onUpdate(candidate.user_id, { recruiter_interview_passed: true });
  };

  const handleFailRecruiter = () => {
    openConfirmModal({
      title: "Fail Recruiter Interview?",
      message:
        "This will mark the candidate as failed for the recruiter interview checkpoint.",
      onConfirm: () => {
        onUpdate(candidate.user_id, { recruiter_interview_passed: false });
      },
    });
  };

  const handleResetRecruiter = () => {
    openConfirmModal({
      title: "Reset Recruiter Checkpoint?",
      message:
        "This will clear the recruiter interview decision, slot timing, and meet link.",
      onConfirm: () => {
        onUpdate(candidate.user_id, { reset_recruiter: true });
      },
    });
  };

  const handleResetReview = () => {
    openConfirmModal({
      title: "Reset Interview Review?",
      message:
        "This will clear the shortlisted/completed/rejected review decision and score for the candidate. The interview will return to review pending status.",
      onConfirm: () => {
        onUpdate(candidate.user_id, { reset_review: true });
      },
    });
  };

  const handleResetAdditionalDocs = () => {
    openConfirmModal({
      title: "Reset Additional Documents Checkpoint?",
      message: "This will permanently delete the candidate's uploaded supporting documents from storage. They will be required to re-upload all requested documents.",
      onConfirm: () => {
        const updatedSteps = steps.map((s) => {
          if (s.id === "additional_documents") return { ...s, status: "pending" };
          return s;
        });
        onUpdate(candidate.user_id, {
          steps_config: updatedSteps,
          reset_additional_docs: true,
        });
      },
    });
  };

  const handleApproveAllDocs = () => {
    const updatedDocs = { ...(candidate.additional_documents || {}) };
    (candidate.resolvedRequiredDocs || []).forEach((doc) => {
      if (updatedDocs[doc.id]) {
        updatedDocs[doc.id] = {
          ...updatedDocs[doc.id],
          status: "approved"
        };
      }
    });
    onUpdate(candidate.user_id, { additional_documents: updatedDocs });
  };

  const handleRejectAllDocs = () => {
    const updatedDocs = { ...(candidate.additional_documents || {}) };
    (candidate.resolvedRequiredDocs || []).forEach((doc) => {
      if (updatedDocs[doc.id]) {
        updatedDocs[doc.id] = {
          ...updatedDocs[doc.id],
          status: "rejected"
        };
      }
    });
    onUpdate(candidate.user_id, { additional_documents: updatedDocs });
  };

  const handleDeleteOfferLetter = () => {
    openConfirmModal({
      title: "Delete Offer Letter?",
      message:
        "This will permanently delete the uploaded offer letter PDF file from storage.",
      onConfirm: () => {
        onUpdate(candidate.user_id, { offer_letter_url: "clear" });
      },
    });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => s.id === active.id);
      const newIndex = steps.findIndex((s) => s.id === over.id);
      const updatedSteps = arrayMove(steps, oldIndex, newIndex);
      setSteps(updatedSteps);
      onUpdate(candidate.user_id, { steps_config: updatedSteps });
    }
  };

  const handleToggleSkippable = (stepId, shouldSkip) => {
    const updatedSteps = steps.map((s) => {
      if (s.id === stepId) {
        return {
          ...s,
          is_skippable: shouldSkip,
          status: shouldSkip ? "skipped" : "pending",
        };
      }
      return s;
    });
    setSteps(updatedSteps);
    onUpdate(candidate.user_id, { steps_config: updatedSteps });
  };

  const initials = (candidate.fullname || "C")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-full overflow-hidden font-sans">
      {/* Header bar */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-700 transition-all flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Candidates</span>
            </button>
          )}
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Candidate Pipeline Details
            </h2>
            <p className="text-[10px] text-slate-400 font-medium">
              Verify documents, schedule classes and dispatch offers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={updating}
            className="p-2 hover:bg-slate-50 border border-slate-150 rounded-xl text-slate-500 hover:text-slate-700 transition-all flex items-center gap-1.5 text-[11px] font-bold disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${updating || loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-50 border border-slate-150 rounded-xl text-slate-500 hover:text-slate-700 transition-all flex items-center gap-1.5 text-[11px] font-bold"
            >
              <X className="w-3.5 h-3.5" />
              Close
            </button>
          )}
        </div>
      </div>

      {/* Main split dashboard view */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 h-full">
        {/* Left Column: Profile Card */}
        <div className="md:col-span-5 border-r border-slate-100 p-5 flex flex-col gap-5 bg-slate-50/30 overflow-y-auto h-full">
          {/* Summary profile badge */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,40,86,0.03)] flex flex-col shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-[#083262] text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-extrabold text-slate-800 text-sm leading-tight truncate">
                    {candidate.fullname || "Unnamed Candidate"}
                  </h3>
                  <span className="px-1.5 py-0.5 bg-blue-50 text-[#083262] text-[8px] font-extrabold rounded-md border border-blue-100 uppercase tracking-wider">
                    {candidate.language_level || candidate.current_profeciency_level || "B1"}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                  {candidate.email || "No Email"}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500 border-t border-slate-100/60 pt-2.5">
              <div className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{candidate.number || "No Phone"}</span>
              </div>
              {candidate.email_verified && (
                <span className="text-emerald-700 font-bold text-[8px] uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                  Verified
                </span>
              )}
            </div>
          </div>

          {/* Uploaded Documents List */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,40,86,0.03)] flex flex-col gap-2.5 shrink-0">
            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Documents & Submissions
            </h4>

            <div className="grid grid-cols-2 gap-2">
              {candidate.resumeDownloadUrl ? (
                <a
                  href={candidate.resumeDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-between transition-all group text-xs text-slate-700"
                >
                  <span className="font-bold truncate">Resume PDF</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-600 shrink-0" />
                </a>
              ) : (
                <div className="p-2 border border-dashed border-slate-200 rounded-xl flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50/20 font-medium">
                  <span className="truncate">No Resume</span>
                </div>
              )}

              {candidate.certDownloadUrl ? (
                <a
                  href={candidate.certDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-between transition-all group text-xs text-slate-700"
                >
                  <span className="font-bold truncate">Lang Cert PDF</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-600 shrink-0" />
                </a>
              ) : (
                <div className="p-2 border border-dashed border-slate-200 rounded-xl flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50/20 font-medium">
                  <span className="truncate">No Cert</span>
                </div>
              )}
            </div>

            {/* Additional Uploaded Documents */}
            {candidate.additional_documents && Object.keys(candidate.additional_documents).length > 0 && (
              <div className="border-t border-slate-100 pt-2.5 mt-1.5 flex flex-col gap-1.5 text-left">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                  Supporting Documents
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {Object.entries(candidate.additional_documents).map(([docId, docObj]) => (
                    docObj.downloadUrl ? (
                      <a
                        key={docId}
                        href={docObj.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-between transition-all group text-[10px] text-slate-700 font-medium"
                      >
                        <div className="truncate pr-2 text-left">
                          <span className="font-bold block truncate max-w-[170px]">{docObj.fileName}</span>
                          <span className="text-[7px] text-slate-400 uppercase">
                            Status: {docObj.status || "pending"}
                          </span>
                        </div>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-600 shrink-0" />
                      </a>
                    ) : null
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Assign Interview & Agreement (Collapsible Accordion) */}
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,40,86,0.03)] shrink-0">
            <summary className="p-4 text-xs font-bold text-slate-600 cursor-pointer select-none flex items-center justify-between hover:bg-slate-50/30">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-slate-400" />
                Assign Interview & Agreement
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
            </summary>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdate(candidate.user_id, {
                  assigned_interview_id: interviewId ? parseInt(interviewId) : null,
                  assigned_agreement_template_id: agreementId || null,
                });
              }}
              className="p-4 border-t border-slate-100 flex flex-col gap-4 bg-white"
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Skillcase Interview
                  </label>
                  <div className="relative">
                    <select
                      value={interviewId}
                      onChange={(e) => setInterviewId(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 pr-8 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] shadow-none transition-all appearance-none"
                    >
                      <option value="">Select Default / No Specific Interview</option>
                      {options.interviews?.map((int) => (
                        <option key={int.position_id} value={int.position_id}>
                          {int.title}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  {!candidate.assigned_interview_id && candidate.globalSettings?.default_interview_id && (
                    <span className="text-[9px] text-slate-400 italic mt-0.5">
                      Currently using global default interview.
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Registration Agreement
                  </label>
                  <div className="relative">
                    <select
                      value={agreementId}
                      onChange={(e) => setAgreementId(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 pr-8 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] shadow-none transition-all appearance-none"
                    >
                      <option value="">Select Default / No Specific Agreement</option>
                      {options.agreements?.map((agr) => (
                        <option key={agr.template_id} value={agr.template_id}>
                          {agr.title}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  {!candidate.assigned_agreement_template_id && candidate.globalSettings?.default_agreement_template_id && (
                    <span className="text-[9px] text-slate-400 italic mt-0.5">
                      Currently using global default agreement.
                    </span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full py-2.5 bg-[#083262] text-white hover:bg-[#052243] rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-none"
              >
                Save Assignment
              </button>
            </form>
          </details>

          {/* Customize Document Checklist (Collapsible Accordion) */}
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,40,86,0.03)] shrink-0 font-sans">
            <summary className="p-4 text-xs font-bold text-slate-600 cursor-pointer select-none flex items-center justify-between hover:bg-slate-50/30">
              <span className="flex items-center gap-1.5 flex-wrap">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Customize Document Checklist
                {candidate.candidate_required_additional_documents !== null && (
                  <span className="text-[7px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1 py-0.5 rounded uppercase tracking-wide">
                    Overridden
                  </span>
                )}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
            </summary>

            <div className="p-4 border-t border-slate-100 flex flex-col gap-4 bg-white">
              {/* Existing documents requirements list */}
              <div className="flex flex-col gap-1.5 text-left">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Active Checklist Requirements
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {(candidate.resolvedRequiredDocs || []).length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No documents currently required.</p>
                  ) : (
                    (candidate.resolvedRequiredDocs || []).map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-2 text-[10px]">
                        <div className="truncate pr-2 text-left">
                          <span className="font-bold text-slate-700 block truncate">{doc.title}</span>
                          <span className="text-[8px] text-slate-400 font-medium">
                            Formats: {doc.allowed_extensions?.join(", ").toUpperCase()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCandDocOverride(doc.id)}
                          disabled={updating}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                          title="Remove Requirement"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add Custom Document for Candidate */}
              <form onSubmit={handleAddCandDocOverride} className="p-3 bg-slate-50/50 border border-slate-150 rounded-xl flex flex-col gap-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase text-left">Request Custom Document</span>
                <input
                  type="text"
                  placeholder="e.g. B2 Language Certificate"
                  value={candDocTitle}
                  onChange={(e) => setCandDocTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-[#083262]"
                />
                
                {/* Formats Checkboxes */}
                <div className="flex flex-wrap gap-2 mt-1">
                  {Object.keys(candDocExts).map((ext) => (
                    <label key={ext} className="flex items-center gap-1 text-[9px] font-bold text-slate-500 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={candDocExts[ext]}
                        onChange={(e) => setCandDocExts(prev => ({ ...prev, [ext]: e.target.checked }))}
                        className="rounded border-slate-200 text-[#083262] focus:ring-0 w-3 h-3"
                      />
                      {ext.toUpperCase()}
                    </label>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={updating}
                  className="w-full py-1.5 bg-[#083262] hover:bg-[#052243] text-white font-bold text-[9px] rounded-lg transition-all mt-1 cursor-pointer"
                >
                  Add Requirement
                </button>
              </form>

              {candidate.candidate_required_additional_documents !== null && (
                <button
                  type="button"
                  onClick={handleResetCandChecklist}
                  disabled={updating}
                  className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 font-bold text-[10px] rounded-xl transition-all mt-1 cursor-pointer"
                >
                  Reset Checklist to Global Defaults
                </button>
              )}
            </div>
          </details>

          {/* Edit Basic Info (Collapsible Accordion) */}
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,40,86,0.03)] shrink-0">
            <summary className="p-4 text-xs font-bold text-slate-600 cursor-pointer select-none flex items-center justify-between hover:bg-slate-50/30">
              <span className="flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                Edit Profile Fields
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
            </summary>

            <form
              onSubmit={handleSaveProfileInfo}
              className="p-4 border-t border-slate-100 flex flex-col gap-4 bg-white"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    className="border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] shadow-none transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] shadow-none transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] shadow-none transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Proficiency Level
                  </label>
                  <div className="relative">
                    <select
                      value={proficiency}
                      onChange={(e) => setProficiency(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 pr-8 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] shadow-none transition-all appearance-none"
                    >
                      <option value="">Select Level</option>
                      <option value="B1">B1</option>
                      <option value="B2">B2</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full py-2.5 bg-[#083262] text-white hover:bg-[#052243] rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-none"
              >
                Update Profile Fields
              </button>
            </form>
          </details>
        </div>

        {/* Right Column: Steps Pipeline Timeline */}
        <div className="md:col-span-7 overflow-y-auto p-6 bg-white h-full">
          <h3 className="text-xs font-bold text-[#083262] uppercase tracking-wider mb-6 pb-2 border-b border-slate-100">
            Pipeline Steps Timeline
          </h3>

          {/* Visual Timeline Wrapper */}
          <div className="relative border-l-2 border-slate-100 ml-4 pl-8 space-y-6 py-2">
            {steps.map((step, index) => {
              const isWelcome = step.id === "welcome";
              const isProfile = step.id === "profile_completion";
              const isInterview = step.id === "interview_attempt";
              const isAgreement = step.id === "registration_form";
              const isReview = step.id === "review_pending";
              const isAdditionalDocs = step.id === "additional_documents";
              const isTraining = step.id === "interview_training";
              const isRecruiterStatus = step.id === "recruiter_status";
              const isRecruiter = step.id === "recruiter_interview";
              const isOffer = step.id === "offer_letter";

              const isCompleted =
                step.status === "completed" || step.status === "skipped";
              const isActive = step.id === candidate.current_step_id;
              const isLocked = !isCompleted && !isActive;

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
                        {step.title}
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
                        {isCompleted
                          ? "Completed"
                          : isActive
                            ? "Active"
                            : "Locked"}
                      </span>
                    </div>

                    {/* Stage Info and Inline Actions */}
                    <div className="text-[11px] text-slate-500 leading-relaxed space-y-3">
                      {isWelcome && (
                        <div>
                          <p>
                            Welcome checkpoint onboarding candidate into the
                            pipeline.
                          </p>
                          {isCompleted && (
                            <button
                              type="button"
                              onClick={handleResetWelcome}
                              className="mt-2 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-2.5 py-1 rounded-lg transition-all"
                            >
                              Reset Welcome
                            </button>
                          )}
                        </div>
                      )}

                      {isProfile && (
                        <div>
                          <p>
                            Verification of candidate credentials, resume, and
                            language certificate.
                          </p>
                          {isCompleted && (
                            <button
                              type="button"
                              onClick={handleResetProfile}
                              className="mt-2 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-2.5 py-1 rounded-lg transition-all"
                            >
                              Reset Profile Verification
                            </button>
                          )}
                          {isActive &&
                            (candidate.resume_url || candidate.lang_cert_url) &&
                            !candidate.email_verified && (
                              <div className="mt-3 p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex flex-col gap-2.5">
                                <span className="font-bold text-[#083262] block">
                                  Verify Documents
                                </span>
                                {candidate.extracted_email && (
                                  <div className="text-[10px] text-slate-500 bg-white p-2 rounded-lg border border-slate-100">
                                    Extracted Email:{" "}
                                    <strong className="text-slate-700">
                                      {candidate.extracted_email}
                                    </strong>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={handleVerifyEmail}
                                    className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-bold rounded-lg transition-all"
                                  >
                                    Approve Profile
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleRejectProfile}
                                    className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 text-[10px] font-bold rounded-lg transition-all"
                                  >
                                    Reject (Reset)
                                  </button>
                                </div>
                              </div>
                            )}
                        </div>
                      )}

                      {isInterview && (
                        <div className="space-y-3">
                          <p>AI-driven proficiency test and video attempt.</p>

                          {/* Selected / Completed details */}
                          {candidate.assigned_interview_title ? (
                            <div className="text-[10px] text-slate-500 bg-slate-50/50 p-2 rounded-lg border border-slate-150/60">
                              Assigned:{" "}
                              <strong className="text-slate-700">
                                {candidate.assigned_interview_title}
                              </strong>
                            </div>
                          ) : (
                            isActive && (
                              <p className="text-[10px] text-amber-600 font-semibold">
                                No Skillcase Interview assigned yet.
                              </p>
                            )
                          )}

                          {/* Actions */}
                          {isActive && (
                            <form
                              onSubmit={handleUpdateInterviewAssignment}
                              className="flex gap-2 items-center w-full"
                            >
                              <div className="relative flex-1 max-w-[200px]">
                                <select
                                  value={interviewId}
                                  onChange={(e) =>
                                    setInterviewId(e.target.value)
                                  }
                                  className="w-full border border-slate-200 rounded-xl p-2.5 pr-8 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] shadow-none transition-all appearance-none"
                                >
                                  <option value="">Assign Interview</option>
                                  {options.interviews?.map((int) => (
                                    <option
                                      key={int.position_id}
                                      value={int.position_id}
                                    >
                                      {int.title}
                                    </option>
                                  ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </div>
                              </div>
                              <button
                                type="submit"
                                className="px-4.5 py-2.5 bg-[#083262] hover:bg-[#052243] text-white rounded-xl text-[10px] font-bold transition-all shadow-none shrink-0"
                              >
                                Assign
                              </button>
                            </form>
                          )}

                          {isCompleted && (
                            <button
                              type="button"
                              onClick={handleResetInterview}
                              className="text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-2.5 py-1 rounded-lg transition-all"
                            >
                              Reset Interview
                            </button>
                          )}
                        </div>
                      )}

                      {isAgreement && (
                        <div className="space-y-3">
                          <p>Contractual agreement and signature templates.</p>

                          {candidate.assigned_agreement_title ? (
                            <div className="text-[10px] text-slate-500 bg-slate-50/50 p-2 rounded-lg border border-slate-150/60">
                              Assigned:{" "}
                              <strong className="text-slate-700">
                                {candidate.assigned_agreement_title}
                              </strong>
                            </div>
                          ) : (
                            isActive && (
                              <p className="text-[10px] text-amber-600 font-semibold">
                                No agreement template assigned yet.
                              </p>
                            )
                          )}

                          {isActive && (
                            <form
                              onSubmit={handleUpdateAgreementAssignment}
                              className="flex gap-2 items-center w-full"
                            >
                              <div className="relative flex-1 max-w-[200px]">
                                <select
                                  value={agreementId}
                                  onChange={(e) =>
                                    setAgreementId(e.target.value)
                                  }
                                  className="w-full border border-slate-200 rounded-xl p-2.5 pr-8 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] shadow-none transition-all appearance-none"
                                >
                                  <option value="">Assign Agreement</option>
                                  {options.agreements?.map((agr) => (
                                    <option
                                      key={agr.template_id}
                                      value={agr.template_id}
                                    >
                                      {agr.title}
                                    </option>
                                  ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </div>
                              </div>
                              <button
                                type="submit"
                                className="px-4.5 py-2.5 bg-[#083262] hover:bg-[#052243] text-white rounded-xl text-[10px] font-bold transition-all shadow-none shrink-0"
                              >
                                Assign
                              </button>
                            </form>
                          )}

                          {isCompleted && (
                            <button
                              type="button"
                              onClick={handleResetAgreement}
                              className="text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-2.5 py-1 rounded-lg transition-all"
                            >
                              Reset Agreement Checkpoint
                            </button>
                          )}
                        </div>
                      )}

                      {isReview && (
                        <div className="space-y-3">
                          <p>
                            Recruiter review evaluation of candidate
                            submissions.
                          </p>

                          {candidate.interview_submitted ? (
                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                              {/* Reviewed Status */}
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="font-semibold text-slate-600">
                                  Reviewed Status:
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                    candidate.interview_is_fully_reviewed
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                      : "bg-red-50 text-red-700 border-red-100"
                                  }`}
                                >
                                  {candidate.interview_is_fully_reviewed
                                    ? "Reviewed"
                                    : "Not Reviewed"}
                                </span>
                              </div>

                              {/* Review Status */}
                              {candidate.interview_review_status &&
                                candidate.interview_review_status !==
                                  "in_review" && (
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className="font-semibold text-slate-600">
                                      Review Status:
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                        candidate.interview_review_status ===
                                          "shortlisted" ||
                                        candidate.interview_review_status ===
                                          "completed"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                          : candidate.interview_review_status ===
                                              "rejected"
                                            ? "bg-rose-50 text-rose-700 border-rose-100"
                                            : "bg-amber-50 text-amber-700 border-amber-100"
                                      }`}
                                    >
                                      {candidate.interview_review_status}
                                    </span>
                                  </div>
                                )}

                              {/* Score */}
                              {(candidate.interview_overall_score !== null ||
                                candidate.interview_calculated_score !==
                                  null) && (
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="font-semibold text-slate-600">
                                    Score:
                                  </span>
                                  <span className="font-bold text-slate-800">
                                    {candidate.interview_overall_score !== null
                                      ? candidate.interview_overall_score
                                      : candidate.interview_calculated_score}{" "}
                                    / 10
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-[10px] text-zinc-400 font-semibold">
                              No Skillcase Interview submitted yet.
                            </p>
                          )}

                          {isActive && candidate.interview_submitted && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2.5">
                              <span className="font-bold text-[#083262] block">
                                Evaluation Decision
                              </span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handlePassReview}
                                  className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-bold rounded-lg transition-all"
                                >
                                  Pass Candidate
                                </button>
                                <button
                                  type="button"
                                  onClick={handleFailReview}
                                  className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 text-[10px] font-bold rounded-lg transition-all"
                                >
                                  Fail Candidate
                                </button>
                              </div>
                            </div>
                          )}

                          {isCompleted && (
                            <button
                              type="button"
                              onClick={handleResetReview}
                              className="mt-2 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-2.5 py-1 rounded-lg transition-all"
                            >
                              Reset Review Decision
                            </button>
                          )}
                        </div>
                      )}

                      {isAdditionalDocs && (
                        <div className="space-y-3">
                          <p>
                            Verify the candidate's custom supporting document submissions.
                          </p>

                          <div className="space-y-2">
                            {(candidate.resolvedRequiredDocs || []).length === 0 ? (
                              <p className="text-[10px] text-zinc-400 font-semibold italic">
                                No required documents configured.
                              </p>
                            ) : (
                              (candidate.resolvedRequiredDocs || []).map((doc) => {
                                const fileObj = candidate.additional_documents?.[doc.id];
                                const isDocUploaded = !!fileObj?.key;
                                
                                return (
                                  <div key={doc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-800 text-[11px] truncate max-w-[200px] sm:max-w-xs block text-left">
                                        {doc.title}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border tracking-wider shrink-0 ${
                                          isDocUploaded
                                            ? fileObj.status === "approved"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                              : fileObj.status === "rejected"
                                                ? "bg-rose-50 text-rose-700 border-rose-100"
                                                : "bg-amber-50 text-amber-700 border-amber-100"
                                            : "bg-slate-100 text-slate-400 border-slate-200"
                                        }`}
                                      >
                                        {isDocUploaded ? fileObj.status === "approved" ? "Approved" : fileObj.status === "rejected" ? "Rejected" : "Pending Review" : "Awaiting Upload"}
                                      </span>
                                    </div>

                                    {isDocUploaded ? (
                                      <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100/80 text-[10px] text-slate-500">
                                          <span className="truncate max-w-[150px] font-bold text-slate-700">
                                            {fileObj.fileName}
                                          </span>
                                          {fileObj.downloadUrl && (
                                            <a
                                              href={fileObj.downloadUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:underline flex items-center gap-0.5 shrink-0"
                                            >
                                              View file <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {isActive && (candidate.resolvedRequiredDocs || []).some(doc => candidate.additional_documents?.[doc.id]?.key) && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
                              <span className="font-bold text-[#083262] text-[11px] text-left block">
                                Supporting Documents Decision
                              </span>
                              <div className="flex gap-2.5 justify-start">
                                <button
                                  type="button"
                                  onClick={handleApproveAllDocs}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                                >
                                  Approve All Documents
                                </button>
                                <button
                                  type="button"
                                  onClick={handleRejectAllDocs}
                                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                                >
                                  Reject All Documents
                                </button>
                              </div>
                            </div>
                          )}

                          {isCompleted && (
                            <button
                              type="button"
                              onClick={handleResetAdditionalDocs}
                              className="mt-2 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                            >
                              Reset Documents Checkpoint
                            </button>
                          )}
                        </div>
                      )}

                      {isTraining && (
                        <div className="space-y-3">
                          <p>
                            Interactive mentoring classes scheduled via Google
                            Meet.
                          </p>

                          {candidate.training_slot_time && (
                            <div className="text-[10px] text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-150 space-y-1">
                              <div>
                                Schedule:{" "}
                                <strong className="text-slate-700">
                                  {new Date(
                                    candidate.training_slot_time,
                                  ).toLocaleString(undefined, {
                                    year: "numeric",
                                    month: "numeric",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  })}
                                </strong>
                              </div>
                              {candidate.training_meet_link && (
                                <div className="flex items-center gap-1">
                                  Meet URL:
                                  <a
                                    href={candidate.training_meet_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-0.5 truncate max-w-[150px]"
                                  >
                                    {candidate.training_meet_link}{" "}
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                              )}
                              {candidate.training_completed === false && (
                                <div className="text-[9px] text-rose-600 bg-rose-50 border border-rose-100/50 px-2 py-0.5 rounded font-bold uppercase inline-block mt-1">
                                  Status: Failed / Rejected
                                </div>
                              )}
                            </div>
                          )}

                          {(isActive || isCompleted) && (
                            <details className="group border border-slate-200 bg-slate-50/10 rounded-xl overflow-hidden">
                              <summary className="p-2.5 text-[10px] font-bold text-slate-500 cursor-pointer select-none bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between">
                                <span>Schedule Training Slot</span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform" />
                              </summary>
                              <form
                                onSubmit={handleSaveTrainingSchedule}
                                className="p-3.5 border-t border-slate-100 flex flex-col gap-3 bg-white"
                              >
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                    Date & Time
                                  </span>
                                  <input
                                    type="datetime-local"
                                    value={trainingTime}
                                    onChange={(e) =>
                                      setTrainingTime(e.target.value)
                                    }
                                    className="border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] shadow-none transition-all"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                    Google Meet Link
                                  </span>
                                  <input
                                    type="url"
                                    placeholder="https://meet.google.com/..."
                                    value={trainingMeet}
                                    onChange={(e) =>
                                      setTrainingMeet(e.target.value)
                                    }
                                    className="border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] shadow-none transition-all"
                                  />
                                </div>
                                <button
                                  type="submit"
                                  className="w-full py-2 bg-[#083262] hover:bg-[#052243] text-white rounded-xl text-[10px] font-bold transition-all shadow-none"
                                >
                                  Save Schedule
                                </button>
                              </form>
                            </details>
                          )}

                          {isActive &&
                            candidate.training_slot_time &&
                            candidate.training_completed !== true && (
                              <div className="flex gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                                <button
                                  type="button"
                                  onClick={handlePassTraining}
                                  className="px-3 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700"
                                >
                                  Approve (Complete Training)
                                </button>
                                {candidate.training_completed !== false && (
                                  <button
                                    type="button"
                                    onClick={handleFailTraining}
                                    className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[10px] font-bold hover:bg-rose-100"
                                  >
                                    Reject (Fail Candidate)
                                  </button>
                                )}
                              </div>
                            )}

                          {isCompleted && (
                            <button
                              type="button"
                              onClick={handleResetTraining}
                              className="text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-2.5 py-1 rounded-lg transition-all"
                            >
                              Reset Training Checkpoint
                            </button>
                          )}
                        </div>
                      )}

                      {isRecruiterStatus && (
                        <div className="space-y-3">
                          <p>
                            Configure recruitment partner status visibility for the candidate. Checked partners will be visible on the candidate dashboard.
                          </p>

                          {candidate.recruiter_shares && candidate.recruiter_shares.length > 0 ? (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                              <span className="font-bold text-[#083262] text-[10px] uppercase tracking-wider block">
                                Partner Visibility Check-list
                              </span>
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {candidate.recruiter_shares.map((rec) => {
                                  const isChecked = rec.is_visible;
                                  return (
                                    <label
                                      key={rec.account_id}
                                      className="flex items-center gap-2.5 p-2 bg-white border border-slate-100 rounded-lg text-xs text-slate-700 hover:bg-slate-50/50 cursor-pointer select-none"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const currentVisible = candidate.visible_recruiter_ids || [];
                                          let newVisible;
                                          if (e.target.checked) {
                                            newVisible = [...currentVisible, rec.account_id];
                                          } else {
                                            newVisible = currentVisible.filter((id) => id !== rec.account_id);
                                          }
                                          onUpdate(candidate.user_id, {
                                            visible_recruiter_ids: newVisible,
                                          });
                                        }}
                                        className="rounded border-slate-200 text-[#083262] focus:ring-0 w-3.5 h-3.5"
                                      />
                                      <div className="flex flex-col gap-0.5">
                                        <span className="font-bold">{rec.recruiter_email}</span>
                                        <span className="text-[9px] text-slate-400 uppercase font-semibold">
                                          Current Status: {rec.stage || "Submitted"}
                                        </span>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-[10px] font-bold">
                              No recruiter connections found. Share the candidate's profile via the Explorer Library to manage recruiter statuses.
                            </div>
                          )}
                        </div>
                      )}
 
                      {isRecruiter && (
                        <div className="space-y-3">
                          <p>
                            Scheduled final evaluation recruiter interview
                            session.
                          </p>

                          {candidate.recruiter_slot_time && (
                            <div className="text-[10px] text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-150 space-y-1">
                              <div>
                                Schedule:{" "}
                                <strong className="text-slate-700">
                                  {new Date(
                                    candidate.recruiter_slot_time,
                                  ).toLocaleString(undefined, {
                                    year: "numeric",
                                    month: "numeric",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  })}
                                </strong>
                              </div>
                              {candidate.recruiter_meet_link && (
                                <div className="flex items-center gap-1">
                                  Meet URL:
                                  <a
                                    href={candidate.recruiter_meet_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-0.5 truncate max-w-[150px]"
                                  >
                                    {candidate.recruiter_meet_link}{" "}
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                              )}
                              {candidate.recruiter_interview_passed === false && (
                                <div className="text-[9px] text-rose-600 bg-rose-50 border border-rose-100/50 px-2 py-0.5 rounded font-bold uppercase inline-block mt-1">
                                  Status: Failed / Rejected
                                </div>
                              )}
                            </div>
                          )}

                          {(isActive || isCompleted) && (
                            <details className="group border border-slate-200 bg-slate-50/10 rounded-xl overflow-hidden">
                              <summary className="p-2.5 text-[10px] font-bold text-slate-500 cursor-pointer select-none bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between">
                                <span>Schedule Recruiter Slot</span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform" />
                              </summary>
                              <form
                                onSubmit={handleSaveRecruiterSchedule}
                                className="p-3.5 border-t border-slate-100 flex flex-col gap-3 bg-white"
                              >
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                    Date & Time
                                  </span>
                                  <input
                                    type="datetime-local"
                                    value={recruiterTime}
                                    onChange={(e) =>
                                      setRecruiterTime(e.target.value)
                                    }
                                    className="border border-slate-205 rounded-xl p-2.5 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] shadow-none transition-all"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                    Google Meet Link
                                  </span>
                                  <input
                                    type="url"
                                    placeholder="https://meet.google.com/..."
                                    value={recruiterMeet}
                                    onChange={(e) =>
                                      setRecruiterMeet(e.target.value)
                                    }
                                    className="border border-slate-205 rounded-xl p-2.5 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-[#083262]/10 focus:border-[#083262] shadow-none transition-all"
                                  />
                                </div>
                                <button
                                  type="submit"
                                  className="w-full py-2 bg-[#083262] hover:bg-[#052243] text-white rounded-xl text-[10px] font-bold transition-all shadow-none"
                                >
                                  Save Schedule
                                </button>
                              </form>
                            </details>
                          )}

                          {isActive &&
                            candidate.recruiter_slot_time &&
                            candidate.recruiter_interview_passed !== true && (
                              <div className="flex gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                                <button
                                  type="button"
                                  onClick={handlePassRecruiter}
                                  className="px-3 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700"
                                >
                                  Approve (Pass Candidate)
                                </button>
                                {candidate.recruiter_interview_passed !== false && (
                                  <button
                                    type="button"
                                    onClick={handleFailRecruiter}
                                    className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[10px] font-bold hover:bg-rose-100"
                                  >
                                    Reject (Fail Candidate)
                                  </button>
                                )}
                              </div>
                            )}

                          {isCompleted && (
                            <button
                              type="button"
                              onClick={handleResetRecruiter}
                              className="text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-2.5 py-1 rounded-lg transition-all"
                            >
                              Reset Recruiter Checkpoint
                            </button>
                          )}
                        </div>
                      )}

                      {isOffer && (
                        <div className="space-y-3">
                          <p>
                            Dispatch of final offer letter PDF to selected
                            candidate.
                          </p>

                          {candidate.offer_letter_url ? (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                              <a
                                href={candidate.offerLetterDownloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-slate-700 font-semibold hover:text-blue-600 transition-colors truncate max-w-[180px]"
                              >
                                <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="truncate">
                                  Offer Letter.pdf
                                </span>
                              </a>
                              <button
                                type="button"
                                onClick={handleDeleteOfferLetter}
                                className="p-1 hover:bg-rose-50 text-rose-600 rounded transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            isActive && (
                              <div className="relative border border-dashed border-slate-350 rounded-xl p-4 bg-slate-50/30 hover:border-[#083262] transition-all flex flex-col items-center justify-center cursor-pointer">
                                <input
                                  type="file"
                                  accept=".pdf"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file)
                                      onUploadOfferLetter(
                                        candidate.user_id,
                                        file,
                                      );
                                  }}
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                                <span className="text-[10px] font-bold text-slate-500">
                                  Upload Offer Letter PDF
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Advanced Pipeline Reordering Settings */}
          <details className="group border border-slate-100 rounded-xl bg-slate-50/20 mt-6 overflow-hidden">
            <summary className="p-3 text-xs font-bold text-slate-600 bg-slate-50/50 cursor-pointer select-none flex items-center justify-between hover:bg-slate-50">
              <span>Customize Pipeline Step Order (Advanced)</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="p-4 border-t border-slate-100 flex flex-col gap-3 bg-white">
              <div className="text-[10px] text-slate-500 font-medium mb-2">
                Drag steps to reorder the pipeline sequence for this candidate.
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={steps.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {steps.map((step) => (
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
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-4">
              <AlertCircle className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">
              {confirmModal.title}
            </h3>
            <p className="text-[11px] text-zinc-500 leading-relaxed mb-6">
              {confirmModal.message}
            </p>
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
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  closeConfirmModal();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-[11px] transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateDetail;
