import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  Clock,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  Calendar,
  Video,
  FileText,
  Lock,
  ArrowLeft,
  Hourglass,
  ClipboardCheck,
  MessageSquare,
  UserCheck,
  FileDown,
  Check,
} from "lucide-react";
import {
  getProgress,
  skipRecruiterStatus,
  downloadOfferLetter,
} from "../../../api/jobScreeningApi";
import shocked from "../../../assets/onboarding/mayaShocked.webp";
import { toast } from "react-hot-toast";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const RecruiterStatusStep = ({ progress, onComplete, onBack }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState("");
  const [activeRecruiterId, setActiveRecruiterId] = useState(null);

  const recruiterShares = progress?.recruiter_shares || [];
  const visibleShares = recruiterShares.filter((rec) => rec.is_visible);
  const recruiterInterviews = progress?.recruiter_interviews || {};

  const hasOffer = visibleShares.some((rec) => {
    const recData = recruiterInterviews[rec.account_id] || {};
    return !!recData.offer_letter_url && recData.interview_passed === true;
  });

  const isStep2Completed = visibleShares.some((rec) => {
    const recData = recruiterInterviews[rec.account_id] || {};
    return recData.interview_passed === true;
  });

  const isStep3Completed = hasOffer;

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError("");
      const { data } = await getProgress();
      if (data?.success && onComplete) {
        const nextStep = data.data?.current_step_id;
        const shouldExit = nextStep !== "recruiter_status";
        onComplete(data.data, shouldExit);
      } else {
        setError("Failed to sync progress.");
      }
    } catch (err) {
      console.error("Error refreshing progress:", err);
      setError(
        err.response?.data?.message ||
          "An error occurred while syncing progress.",
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleSkip = async () => {
    try {
      setSkipping(true);
      setError("");
      const { data } = await skipRecruiterStatus();
      if (data?.success && onComplete) {
        onComplete(data.data);
      } else {
        setError("Failed to proceed to the next stage.");
      }
    } catch (err) {
      console.error("Error skipping step:", err);
      setError(
        err.response?.data?.message ||
          "An error occurred while trying to skip this stage.",
      );
    } finally {
      setSkipping(false);
    }
  };

  const handleDownloadOffer = async (accountId) => {
    try {
      setDownloadingId(accountId);
      const { data } = await downloadOfferLetter(accountId);
      if (data?.success && data.downloadUrl) {
        window.location.href = data.downloadUrl;
      } else {
        toast.error("Failed to generate download link.");
      }
    } catch (err) {
      console.error("Error downloading offer letter:", err);
      toast.error("Error downloading offer letter.");
    } finally {
      setDownloadingId(null);
    }
  };

  const getFormattedDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getFormattedTimeRange = (dateStr) => {
    if (!dateStr) return "";
    const start = new Date(dateStr);
    if (isNaN(start.getTime())) return dateStr;

    const formatTime = (dateObj) => {
      let hours = dateObj.getHours();
      const minutes = String(dateObj.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes} ${ampm}`;
    };

    const startTimeStr = formatTime(start);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const endTimeStr = formatTime(end);

    return `${startTimeStr} - ${endTimeStr}`;
  };

  const handleAddToCalendar = (slotTime, meetLink) => {
    if (!slotTime) return;
    const start = new Date(slotTime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const title = "Skillcase Recruiter Interview";
    const details =
      "This is your live recruiter interview. Be prepared and professional.";

    const formatCalendarTime = (date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    };

    const dates = `${formatCalendarTime(start)}/${formatCalendarTime(end)}`;
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title,
    )}&dates=${dates}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(
      meetLink || "",
    )}`;
    window.open(googleCalendarUrl, "_blank");
  };

  const onBackClick = () => {
    if (activeRecruiterId) {
      setActiveRecruiterId(null);
    } else if (onBack) {
      onBack();
    }
  };

  // RENDER RECRUITER SPECIFIC SCREEN (INTERVIEW CALL OR PDF OFFER PREVIEW)
  if (activeRecruiterId) {
    const activeRec = visibleShares.find(
      (r) => r.account_id === activeRecruiterId,
    );
    const recData = recruiterInterviews[activeRecruiterId] || {};
    const hasOffer =
      !!recData.offer_letter_url && recData.interview_passed === true;

    if (activeRec) {
      if (hasOffer) {
        // STATE 3: CONGRATULATIONS & PDF OFFER PREVIEW
        return (
          <div className="w-full bg-white text-[#002856] flex flex-col items-start justify-start relative">
            {/* Header bar */}
            <div className="w-full flex items-center justify-between mb-4">
              <button
                onClick={onBackClick}
                className="flex items-center gap-1 text-slate-800 text-sm font-semibold hover:text-black cursor-pointer bg-transparent border-none p-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <span className="text-slate-400 text-sm font-semibold">
                Job Progress
              </span>
            </div>

            {/* Gradient Container Card */}
            <div className="w-full px-5 pt-10 pb-5 bg-gradient-to-b from-blue-100 to-blue-50 rounded-2xl border border-white/20 flex flex-col items-center gap-6">
              <div className="w-12 h-12 bg-blue-950 rounded-xl flex items-center justify-center text-white shrink-0">
                <FileText className="w-6 h-6" />
              </div>

              <div className="text-center w-full">
                <h2 className="text-[#002856] text-2xl font-bold tracking-tight">
                  Congratulations
                </h2>
                <p className="text-[#002856]/70 text-xs sm:text-sm font-medium mt-2 max-w-[285px] mx-auto leading-relaxed">
                  You have received an offer letter from{" "}
                  <span className="font-bold text-blue-950">
                    {activeRec.recruiter_email}
                  </span>
                </p>
              </div>

              {/* PDF Page 1 cover rendering */}
              {recData.offer_letter_download_url && (
                <div className="w-full h-56 bg-zinc-100 rounded-xl overflow-hidden relative border border-zinc-200 flex justify-center items-center pointer-events-none select-none shadow-sm mb-2">
                  <div className="scale-[0.45] origin-center absolute">
                    <Document
                      file={recData.offer_letter_download_url}
                      loading={
                        <div className="text-xs text-slate-450 font-bold">
                          Loading preview...
                        </div>
                      }
                    >
                      <Page
                        pageNumber={1}
                        width={343}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </Document>
                  </div>
                  <div className="absolute inset-0 bg-black/[0.02]" />
                </div>
              )}

              {/* Download CTA Button */}
              <button
                type="button"
                onClick={() => handleDownloadOffer(activeRecruiterId)}
                disabled={downloadingId === activeRecruiterId}
                className="w-full h-12 bg-blue-950 hover:bg-[#0c223c] text-white rounded-lg shadow-sm font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer text-center disabled:opacity-50"
              >
                <FileDown className="w-4 h-4" />
                {downloadingId === activeRecruiterId
                  ? "Preparing Download..."
                  : "Download offer letter"}
              </button>
            </div>
          </div>
        );
      } else if (recData.slot_time) {
        // STATE 2: INTERVIEW CALL SCREEN
        return (
          <div className="w-full bg-white text-[#002856] flex flex-col items-start justify-start relative">
            {/* Header bar */}
            <div className="w-full flex items-center justify-between mb-4">
              <button
                onClick={onBackClick}
                className="flex items-center gap-1 text-slate-800 text-sm font-semibold hover:text-black cursor-pointer bg-transparent border-none p-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <span className="text-slate-400 text-sm font-semibold">
                Job Progress
              </span>
            </div>

            {/* Gradient Container Card */}
            <div className="w-full px-5 pt-8 pb-5 bg-gradient-to-b from-[#e0f2fe] to-[#f0f9ff] rounded-2xl border border-white/20 flex flex-col items-center gap-6">
              <div className="w-12 h-12 bg-blue-950 rounded-xl flex items-center justify-center text-white shrink-0">
                <Calendar className="w-6 h-6" />
              </div>

              <div className="text-center w-full">
                <h2 className="text-[#002856] text-2xl font-bold tracking-tight">
                  Your interview call has been scheduled
                </h2>
                <p className="text-[#002856]/70 text-xs sm:text-sm font-medium mt-2 max-w-[280px] mx-auto leading-relaxed">
                  Your interview slot has been confirmed. Please find your event
                  details below.
                </p>
              </div>

              {/* Schedule Image confirmation */}
              {recData.schedule_image_download_url ? (
                <div className="w-full flex justify-center mt-2">
                  <img
                    src={recData.schedule_image_download_url}
                    alt="Schedule"
                    className="w-auto max-w-full max-h-56 object-contain rounded-xl border border-slate-100 shadow-sm bg-white"
                  />
                </div>
              ) : (
                <div className="w-full flex flex-col items-start pl-1 gap-5 mt-2 py-4 rounded-xl">
                  <div className="w-full max-w-[280px] flex flex-col gap-4">
                    <div className="flex justify-start items-start gap-4">
                      <div className="w-10 h-10 bg-[#002856]/5 rounded-lg flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4 text-[#002856]" />
                      </div>
                      <div className="flex-1 flex flex-col justify-start items-start text-left">
                        <span className="opacity-70 text-black text-[10px] font-bold uppercase tracking-wider">
                          DATE
                        </span>
                        <span className="text-[#002856] text-base font-semibold mt-0.5">
                          {getFormattedDate(recData.slot_time)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-start items-start gap-4">
                      <div className="w-10 h-10 bg-[#002856]/5 rounded-lg flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-[#002856]" />
                      </div>
                      <div className="flex-1 flex flex-col justify-start items-start text-left">
                        <span className="opacity-70 text-black text-[10px] font-bold uppercase tracking-wider">
                          TIME
                        </span>
                        <span className="text-[#002856] text-base font-semibold mt-0.5">
                          {getFormattedTimeRange(recData.slot_time)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-start items-start gap-4">
                      <div className="w-10 h-10 bg-[#002856]/5 rounded-lg flex items-center justify-center shrink-0">
                        <UserCheck className="w-4 h-4 text-[#002856]" />
                      </div>
                      <div className="flex-1 flex flex-col justify-start items-start text-left">
                        <span className="opacity-70 text-black text-[10px] font-bold uppercase tracking-wider">
                          RECRUITER
                        </span>
                        <span className="text-[#002856] text-base font-semibold mt-0.5">
                          {activeRec.recruiter_email}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Advisory note box */}
              <div className="w-full bg-white rounded-2xl border border-slate-200/80 flex items-center gap-3.5 shadow-sm text-left">
                <img
                  src={shocked}
                  alt="Mascot Alert"
                  className="w-20 h-20 object-contain shrink-0 select-none"
                  draggable="false"
                />
                <div className="min-w-0 flex-1 py-3 pr-4">
                  <h5 className="text-slate-800 text-xs sm:text-sm font-bold">
                    Please note
                  </h5>
                  <p className="text-slate-500 text-[10px] sm:text-xs mt-0.5 leading-normal">
                    Typically takes around 24- 48 hrs. You will be notified.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="w-full flex flex-col gap-3">
                {recData.meet_link ? (
                  <a
                    href={recData.meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-12 bg-[#002856] hover:bg-[#001c3d] text-white rounded-lg shadow-sm font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer text-center"
                  >
                    <Video className="w-4 h-4" />
                    Join Google Meet
                  </a>
                ) : (
                  <div className="p-3 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-100 text-xs font-semibold text-center leading-relaxed">
                    Meeting link is being generated. It will appear here shortly
                    before the slot time.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    handleAddToCalendar(recData.slot_time, recData.meet_link)
                  }
                  className="w-full h-12 bg-white hover:bg-slate-50 text-[#002856] border border-[#002856] rounded-lg shadow-sm font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  Add to your calendar
                </button>

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="w-full h-10 bg-transparent text-[#002856] hover:underline rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh Details
                </button>
              </div>
            </div>
          </div>
        );
      }
    }
  }

  // MAIN SCREEN VIEW (timeline checklist + recruiter cards list)
  const showOpportunityList = visibleShares.length > 0;

  return (
    <div className="w-full bg-white flex flex-col justify-start items-stretch overflow-hidden mx-auto">
      {/* Back button and Job Progress */}
      <div className="w-full flex flex-col justify-start items-stretch gap-2.5">
        <div className="self-stretch flex justify-between items-center">
          <button
            onClick={onBackClick}
            className="px-0.5 flex justify-center items-center gap-2 bg-transparent border-none cursor-pointer text-slate-900 font-semibold text-sm hover:text-black"
          >
            <div className="w-4 h-4 relative flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <div className="text-center justify-start text-slate-900 text-sm font-semibold leading-6">
              Back
            </div>
          </button>
          <div className="text-center justify-start text-neutral-500 text-sm font-semibold leading-6">
            Job Progress
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 text-red-600 text-xs font-semibold p-3 bg-red-50 rounded-xl border border-red-100 mb-4 w-full">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {showOpportunityList ? (
        /* NEW OPPORTUNITY LIST VIEW */
        <div className="w-full pt-2 pb-10 flex flex-col justify-start items-stretch gap-6">
          {/* Header text */}
          <div className="self-stretch flex flex-col justify-start items-stretch gap-3">
            <h2 className="text-[#002856] text-2xl font-bold tracking-tight text-left">
              Final Interview status
            </h2>
            <p className="text-[#002856]/70 text-xs font-medium leading-relaxed text-left">
              We are presenting your profile to top German employers for
              interview opportunities.
            </p>
          </div>

          {/* Cards List */}
          <div className="w-full flex flex-col gap-4">
            {visibleShares.map((rec) => {
              const recData = recruiterInterviews[rec.account_id] || {};
              const hasOffer =
                !!recData.offer_letter_url && recData.interview_passed === true;
              const hasSlot = !!recData.slot_time;
              const isRejected =
                rec.stage === "rejected" || recData.interview_passed === false;
              const isPassed = recData.interview_passed === true;

              // Badge configs
              let badgeBg = "bg-amber-100/60";
              let badgeText = "text-orange-400";
              let badgeLabel = "Under employer review";

              if (hasOffer) {
                badgeBg = "bg-green-700/10";
                badgeText = "text-green-700";
                badgeLabel = "Offer letter received";
              } else if (isRejected) {
                badgeBg = "bg-rose-50 border-rose-100";
                badgeText = "text-rose-700";
                badgeLabel = "Rejected";
              } else if (hasSlot) {
                badgeBg = "bg-blue-50 border-blue-100";
                badgeText = "text-blue-700";
                badgeLabel = "Interview scheduled";
              } else if (isPassed) {
                badgeBg = "bg-amber-50 border-amber-100";
                badgeText = "text-amber-700";
                badgeLabel = "Awaiting offer letter";
              }

              return (
                <div
                  key={rec.account_id}
                  className="w-full p-6 bg-white rounded-2xl border border-slate-200 flex flex-col gap-6 shadow-sm"
                >
                  <div className="self-stretch flex flex-col justify-start items-start gap-5">
                    {/* Status Badge */}
                    <div
                      className={`px-3 py-1 rounded-[40px] border border-transparent inline-flex items-center justify-center ${badgeBg}`}
                    >
                      <span
                        className={`text-xs font-semibold leading-none tracking-wide uppercase ${badgeText}`}
                      >
                        {badgeLabel}
                      </span>
                    </div>

                    {/* Job Details */}
                    <div className="self-stretch flex flex-col justify-start items-start gap-4">
                      <div className="self-stretch flex justify-between items-start gap-3">
                        <div className="text-slate-900 text-lg font-bold truncate text-left">
                          {recData.job_title || "Details pending"}
                        </div>
                        <div className="pl-1.5 pr-2 py-0.5 bg-slate-50 rounded-md border border-slate-200 flex items-center gap-1.5 shrink-0">
                          <div className="text-slate-700 text-xs font-medium">
                            {recData.location || "Location TBC"}
                          </div>
                        </div>
                      </div>
                      <div className="self-stretch text-slate-500 text-xs font-normal text-left leading-relaxed">
                        {recData.job_description ||
                          "Job details will appear here once confirmed by the recruiter."}
                      </div>
                    </div>

                    {/* Meta info tags */}
                    <div className="self-stretch inline-flex justify-start items-center gap-4 text-slate-500 text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{recData.job_type || "Full-time"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Hourglass className="w-4 h-4 text-slate-400" />
                        <span>{recData.salary_range || "Salary TBC"}</span>
                      </div>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  {hasOffer ? (
                    <button
                      type="button"
                      onClick={() => setActiveRecruiterId(rec.account_id)}
                      className="self-stretch px-4 py-3 bg-gradient-to-r from-amber-200 to-amber-300 rounded-xl justify-center items-center gap-1.5 flex border border-amber-300 cursor-pointer shadow-sm active:scale-[0.99] transition-all font-bold text-blue-950 text-base"
                    >
                      Read & Download offer letter
                    </button>
                  ) : isRejected ? (
                    <div className="self-stretch py-3 text-center text-rose-600 text-xs font-normal italic bg-rose-50 border border-rose-100 rounded-lg">
                      Position has been closed.
                    </div>
                  ) : hasSlot ? (
                    <button
                      type="button"
                      onClick={() => setActiveRecruiterId(rec.account_id)}
                      className="self-stretch px-4 py-3 bg-[#002856] rounded-xl border border-blue-950/40 justify-center items-center gap-1.5 flex cursor-pointer disabled:opacity-50 active:scale-[0.99] transition-all font-medium text-white text-base"
                    >
                      Check interview schedule
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="self-stretch px-4 py-3 bg-[#002856] rounded-lg border border-blue-950/40 justify-center items-center gap-1.5 flex cursor-pointer disabled:opacity-50 active:scale-[0.99] transition-all font-bold text-white text-sm"
                    >
                      {!refreshing ? "Check Status" : "Checking Status..."}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* CURRENT CHECKLIST VIEW FOR NO RECRUITERS ASSIGNED */
        <div className="w-full pt-4 pb-10 flex flex-col justify-start items-stretch gap-2.5">
          <div className="flex-1 px-5 pt-10 pb-5 bg-gradient-to-b from-blue-100 to-blue-50 rounded-xl flex flex-col justify-start items-stretch gap-2.5">
            <div className="flex-1 flex flex-col justify-start items-stretch gap-9">
              <div className="self-stretch flex flex-col justify-start items-stretch gap-5">
                {/* Top Icon box */}
                <div className="w-12 h-12 relative bg-blue-950 rounded-xl overflow-hidden flex items-center justify-center shrink-0 mx-auto">
                  <FileText className="w-6 h-6 text-white" />
                </div>

                {/* Title & Subtitle */}
                <div className="self-stretch flex justify-center items-center gap-6">
                  <div className="flex-1 flex flex-col justify-start items-stretch gap-3">
                    <div className="self-stretch text-center justify-start text-blue-950 text-2xl font-semibold">
                      Matching you with German employers
                    </div>
                    <div className="self-stretch text-center justify-start text-blue-950/70 text-base font-medium leading-5">
                      We are presenting your profile to top German employers for
                      interview opportunities.
                    </div>
                  </div>
                </div>

                {/* Checklist */}
                <div className="self-stretch pt-6 flex flex-col justify-start items-stretch gap-6">
                  <div className="self-stretch px-6 flex flex-col justify-start items-stretch">
                    {/* Step 1: Profile shared */}
                    <div className="self-stretch flex justify-start items-stretch gap-3.5">
                      <div className="w-6 flex flex-col items-center shrink-0">
                        <div className="pt-0.5 pb-1.5 inline-flex justify-start items-center gap-2.5">
                          <div className="w-6 h-6 bg-[#0f8a5f] rounded-full flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />
                          </div>
                        </div>
                        <div className="self-stretch flex-1 w-0 border-l border-dashed border-zinc-300 my-1 mx-auto" />
                      </div>
                      <div className="flex-1 pb-5 flex flex-col justify-center items-stretch gap-6">
                        <div className="self-stretch flex flex-col justify-start items-stretch gap-3">
                          <div className="self-stretch flex justify-between items-center text-left">
                            <div className="flex-1 flex flex-col justify-center items-start">
                              <div className="self-stretch flex justify-start items-start">
                                <div className="justify-start text-slate-900 text-base font-semibold leading-6">
                                  Profile shared with partners
                                </div>
                              </div>
                              <div className="self-stretch opacity-70 justify-start text-black text-xs font-normal leading-4">
                                Your profile and documents have been shared with
                                our partners.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Interview with employer */}
                    <div className="self-stretch flex justify-start items-stretch gap-3.5">
                      <div className="w-6 flex flex-col items-center shrink-0">
                        <div className="pt-0.5 pb-1.5 inline-flex justify-start items-center gap-2.5">
                          {isStep2Completed ? (
                            <div className="w-6 h-6 bg-[#0f8a5f] rounded-full flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 bg-blue-950 rounded-full flex items-center justify-center shrink-0">
                              <div className="w-2.5 h-2.5 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                        <div className="self-stretch flex-1 w-0 border-l border-dashed border-zinc-300 my-1 mx-auto" />
                      </div>
                      <div className="flex-1 pb-5 flex flex-col justify-center items-stretch gap-6">
                        <div className="self-stretch flex flex-col justify-start items-stretch gap-3">
                          <div className="self-stretch flex justify-between items-center text-left">
                            <div className="flex-1 flex flex-col justify-center items-start">
                              <div className="self-stretch flex justify-start items-start">
                                <div className="justify-start text-slate-900 text-base font-semibold leading-6">
                                  Interview with employer
                                </div>
                              </div>
                              <div className="w-60 opacity-70 justify-start text-black text-xs font-normal leading-4">
                                We will organize a live interview once an
                                employer selects you.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Offer letter */}
                    <div className="self-stretch flex justify-start items-stretch gap-3.5">
                      <div className="w-6 flex flex-col items-center shrink-0">
                        <div className="pt-0.5 pb-1.5 inline-flex justify-start items-center gap-2.5">
                          {isStep3Completed ? (
                            <div className="w-6 h-6 bg-[#0f8a5f] rounded-full flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border border-zinc-200 flex items-center justify-center shrink-0 bg-white">
                              <Lock className="w-3 h-3 text-zinc-400" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 pb-5 flex flex-col justify-center items-stretch gap-6">
                        <div className="self-stretch flex flex-col justify-start items-stretch gap-3">
                          <div className="self-stretch flex justify-between items-center text-left">
                            <div className="flex-1 flex flex-col justify-center items-start">
                              <div className="self-stretch flex justify-start items-start">
                                <div
                                  className={`justify-start text-base font-semibold leading-6 ${isStep3Completed ? "text-slate-900" : "text-neutral-400"}`}
                                >
                                  Offer letter
                                </div>
                              </div>
                              <div className="w-60 opacity-70 justify-start text-black text-xs font-normal leading-4">
                                Your contract and offer letter will be uploaded
                                here once selected.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Please note box */}
                <div className="self-stretch pl-2 pr-4 bg-white rounded-xl shadow-[0px_4px_12px_0px_rgba(0,0,0,0.10)] outline outline-offset-[-1px] outline-zinc-300 flex justify-center items-center gap-2 overflow-hidden">
                  <img
                    src={shocked}
                    alt="Mascot Advisory"
                    className="w-20 h-20 object-contain shrink-0 select-none"
                    draggable="false"
                  />
                  <div className="flex-1 flex flex-col justify-center items-stretch gap-6">
                    <div className="self-stretch flex flex-col justify-start items-stretch gap-3">
                      <div className="self-stretch flex justify-between items-center text-left">
                        <div className="flex-1 flex flex-col justify-center items-start">
                          <div className="self-stretch flex justify-between items-start">
                            <div className="flex-1 justify-start text-slate-800 text-sm font-semibold leading-5">
                              Please note
                            </div>
                          </div>
                          <div className="self-stretch opacity-70 justify-start text-black text-xs font-normal leading-4">
                            Typically takes around 24- 48 hrs. You will be
                            notified.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sync Refresh Button at bottom of card */}
                <div className="self-stretch flex flex-col gap-3 pt-4 border-t border-slate-200/40">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="self-stretch px-4 py-3 bg-white hover:bg-slate-50 text-blue-950 border border-blue-950 rounded-lg font-semibold text-base flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                    />
                    Refresh status
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruiterStatusStep;
