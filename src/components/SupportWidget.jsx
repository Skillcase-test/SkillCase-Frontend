import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  X,
  Send,
  Image as ImageIcon,
  Loader2,
  Plus,
  PlusCircle,
  Clock,
  History,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Upload,
  FileText,
  ArrowLeft,
  Check,
} from "lucide-react";
import {
  raiseTicket,
  getUserTickets,
  uploadScreenshot,
} from "../api/supportApi";
import toast from "react-hot-toast";
import { trackFeatureEvent } from "../telemetry/events";

export default function SupportWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("new"); // "new" | "history"
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // Lightbox image URL
  const [attachmentPreviewModal, setAttachmentPreviewModal] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [tempSelectedFile, setTempSelectedFile] = useState(null);
  const ticketsRef = useRef([]);
  const fileInputRef = useRef(null);
  const modalFileInputRef = useRef(null);

  // Check if we are on landing page, learn german home, or job screening home
  const showSupport =
    location.pathname === "/" ||
    location.pathname === "/learn-german" ||
    location.pathname === "/job-screening";

  // Position dynamically to avoid overlapping the BottomModeSwitcher
  const hasSwitcher =
    location.pathname === "/" || location.pathname === "/learn-german";
  const widgetBottomStyle = hasSwitcher
    ? "bottom-[84px] md:bottom-[92px]"
    : "bottom-[24px]";

  const fetchTickets = async (silent = false) => {
    if (!silent) setLoadingTickets(true);
    try {
      const res = await getUserTickets();
      if (res.data?.success) {
        setTickets(res.data.tickets || []);
        trackFeatureEvent("support", "history_loaded", {
          lifecycle: "succeeded",
          attributes: { poll_type: silent ? "automatic" : "manual" },
        });
      }
    } catch (err) {
      trackFeatureEvent("support", "history_failed", {
        lifecycle: "failed",
        reasonCode: "api_failed",
        attributes: { poll_type: silent ? "automatic" : "manual" },
      });
      console.error("Failed to load tickets:", err);
    } finally {
      if (!silent) setLoadingTickets(false);
    }
  };

  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  // Poll for status updates while support panel is open (deferred slightly to ensure smooth opening animation)
  useEffect(() => {
    if (!isOpen) return;
    const initialDelay = setTimeout(() => {
      fetchTickets(ticketsRef.current.length > 0);
    }, 350);

    const timer = setInterval(() => {
      fetchTickets(true);
    }, 10000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(timer);
    };
  }, [isOpen]);

  const handleModalFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith("image/")) {
        trackFeatureEvent("support", "attachment_rejected", {
          reasonCode: "type_invalid",
          attributes: {
            validation_code: "type_invalid",
            asset_type: "screenshot",
          },
        });
        toast.error("Only image files are allowed");
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        trackFeatureEvent("support", "attachment_rejected", {
          reasonCode: "size_limit",
          attributes: {
            validation_code: "size_limit",
            asset_type: "screenshot",
          },
        });
        toast.error("Maximum file size is 5MB");
        return;
      }
      setTempSelectedFile(selectedFile);
    }
  };

  const handleConfirmUpload = () => {
    if (!tempSelectedFile) return;
    setFile(tempSelectedFile);
    trackFeatureEvent("support", "attachment_selected", {
      attributes: { asset_type: "screenshot" },
    });
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result);
    };
    reader.readAsDataURL(tempSelectedFile);
    setUploadModalOpen(false);
    setTempSelectedFile(null);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      trackFeatureEvent("support", "validation_blocked", {
        reasonCode: "required_fields",
        attributes: { validation_code: "required_fields" },
      });
      toast.error("Title and description are required");
      return;
    }

    setSubmitting(true);
    let screenshotUrl = null;

    try {
      trackFeatureEvent("support", "ticket_submit_started", {
        lifecycle: "started",
        attributes: { source_route: location.pathname },
      });
      // 1. Upload screenshot if selected
      if (file) {
        const uploadRes = await uploadScreenshot(file);
        if (uploadRes.data?.success) {
          screenshotUrl = uploadRes.data.url;
        } else {
          throw new Error("Screenshot upload failed");
        }
      }

      // 2. Submit ticket
      const ticketRes = await raiseTicket(title, description, screenshotUrl);
      if (ticketRes.data?.success) {
        trackFeatureEvent("support", "ticket_submitted", {
          lifecycle: "succeeded",
          entityType: "support_ticket",
          entityId: ticketRes.data.ticket?.ticket_id,
          attributes: {
            source_route: location.pathname,
            asset_type: file ? "screenshot" : "none",
          },
        });
        toast.success("Support ticket raised successfully");
        setTitle("");
        setDescription("");
        handleRemoveFile();
        fetchTickets(true);
        setActiveTab("history");
      }
    } catch (err) {
      trackFeatureEvent("support", "ticket_submit_failed", {
        lifecycle: "failed",
        reasonCode: "api_failed",
        attributes: { source_route: location.pathname },
      });
      console.error("Error raising ticket:", err);
      toast.error(
        err.response?.data?.error || "Failed to raise support ticket",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "work_in_progress":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
            Processing
          </span>
        );
      case "resolved":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
            Resolved
          </span>
        );
      case "notified":
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-600">
            Submitted
          </span>
        );
    }
  };

  // Listen for custom event from Profile page
  useEffect(() => {
    const handleOpenSupport = () => {
      setIsOpen(true);
      trackFeatureEvent("support", "widget_opened", {
        attributes: {
          source_route: location.pathname,
          trigger: "custom_event",
        },
      });
    };
    window.addEventListener("skillcase:open-support", handleOpenSupport);
    return () => {
      window.removeEventListener("skillcase:open-support", handleOpenSupport);
    };
  }, [location.pathname]);

  const isProfilePage = location.pathname === "/profile";
  const hideFloatingButton = isProfilePage || !showSupport;
  const isFormValid = Boolean(title.trim() && description.trim());

  return (
    <>
      {/* Floating Trigger Button */}
      {!hideFloatingButton && (
        <div
          className={`fixed right-5 ${widgetBottomStyle} z-[99] transition-all duration-300`}
        >
          <Motion.button
            id="support-widget-trigger"
            onClick={() => {
              setIsOpen(true);
              trackFeatureEvent("support", "widget_opened", {
                attributes: { source_route: location.pathname },
              });
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center w-14 h-14 bg-[#002856] text-white rounded-full shadow-[0_8px_30px_rgba(0,40,86,0.3)] hover:brightness-110 focus:outline-none cursor-pointer"
          >
            <MessageSquare className="w-6 h-6" />
          </Motion.button>
        </div>
      )}

      {/* Support Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setIsOpen(false);
                trackFeatureEvent("support", "widget_closed", {
                  attributes: {
                    source_route: location.pathname,
                    trigger: "backdrop",
                  },
                });
              }}
              className="absolute inset-0 bg-black/40 cursor-pointer"
            />

            {/* Sidebar Panel */}
            <Motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col z-10 font-sans overflow-hidden"
            >
              {/* Figma Header */}
              <div className="px-4 pt-4 pb-3 bg-white flex items-center justify-start gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-md border-2 border-slate-400 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Close"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-base font-semibold text-[#002856]">
                  Help &amp; Support
                </h2>
              </div>

              {/* Figma Tabs Row */}
              <div className="px-4 pt-3 bg-white flex items-stretch gap-2 shrink-0 select-none relative z-20">
                <button
                  type="button"
                  onClick={() => setActiveTab("new")}
                  className={`flex-1 py-3 px-3 rounded-t-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
                    activeTab === "new"
                      ? "bg-black/5 text-slate-900"
                      : "bg-transparent text-slate-900 hover:bg-black/5"
                  }`}
                >
                  {activeTab === "new" && (
                    <>
                      <span
                        className="absolute -left-3 bottom-0 w-3 h-3 bg-black/5 pointer-events-none"
                        style={{
                          maskImage:
                            "radial-gradient(circle at 0 0, transparent 12px, black 12px)",
                          WebkitMaskImage:
                            "radial-gradient(circle at 0 0, transparent 12px, black 12px)",
                        }}
                      />
                      <span
                        className="absolute -right-3 bottom-0 w-3 h-3 bg-black/5 pointer-events-none"
                        style={{
                          maskImage:
                            "radial-gradient(circle at 100% 0, transparent 12px, black 12px)",
                          WebkitMaskImage:
                            "radial-gradient(circle at 100% 0, transparent 12px, black 12px)",
                        }}
                      />
                    </>
                  )}
                  <PlusCircle className="w-5 h-5 text-black shrink-0 relative z-10" />
                  <span className="relative z-10">New Ticket</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`flex-1 py-3 px-3 rounded-t-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
                    activeTab === "history"
                      ? "bg-black/5 text-slate-900"
                      : "bg-transparent text-slate-900 hover:bg-black/5"
                  }`}
                >
                  {activeTab === "history" && (
                    <>
                      <span
                        className="absolute -left-3 bottom-0 w-3 h-3 bg-black/5 pointer-events-none"
                        style={{
                          maskImage:
                            "radial-gradient(circle at 0 0, transparent 12px, black 12px)",
                          WebkitMaskImage:
                            "radial-gradient(circle at 0 0, transparent 12px, black 12px)",
                        }}
                      />
                      <span
                        className="absolute -right-3 bottom-0 w-3 h-3 bg-black/5 pointer-events-none"
                        style={{
                          maskImage:
                            "radial-gradient(circle at 100% 0, transparent 12px, black 12px)",
                          WebkitMaskImage:
                            "radial-gradient(circle at 100% 0, transparent 12px, black 12px)",
                        }}
                      />
                    </>
                  )}
                  <History className="w-5 h-5 text-black shrink-0 relative z-10" />
                  <span className="relative z-10">Ticket History</span>
                </button>
              </div>

              {/* Content Panel Body (bg-black/5) */}
              <div className="flex-1 bg-black/5 overflow-y-auto p-4 flex flex-col justify-start items-stretch gap-6">
                {activeTab === "new" ? (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    {/* Field 1: Title / Issue Heading */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-0.5">
                        <label className="text-sm font-medium text-slate-700 leading-5">
                          Title / Issue heading
                        </label>
                        <span className="text-black text-sm font-medium leading-5">
                          *
                        </span>
                      </div>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Payment failed or Chapter video not loading"
                        disabled={submitting}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg shadow-2xs text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                        required
                      />
                    </div>

                    {/* Field 2: Description / Details of the issue */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-0.5">
                        <label className="text-sm font-medium text-slate-700 leading-5">
                          Description/Details of the issue
                        </label>
                        <span className="text-black text-sm font-medium leading-5">
                          *
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Please describe what went wrong and include error messages if any..."
                        disabled={submitting}
                        className="w-full h-28 px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg shadow-2xs text-sm font-normal text-slate-900 placeholder:text-black/25 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none transition-all leading-relaxed"
                        required
                      />
                    </div>

                    {/* Field 3: Attach screenshot (Optional) */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-0.5">
                        <label className="text-sm font-medium text-slate-700 leading-5">
                          Attach screenshot (Optional)
                        </label>
                      </div>

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleModalFileSelect}
                        accept="image/*"
                        className="hidden"
                        disabled={submitting}
                      />

                      {!filePreview ? (
                        <div
                          onClick={() =>
                            !submitting && setUploadModalOpen(true)
                          }
                          className="w-full px-3.5 py-5 bg-white border border-slate-300 rounded-lg shadow-2xs flex flex-col justify-center items-center gap-3 cursor-pointer hover:border-slate-400 transition-colors"
                        >
                          <div className="w-8 h-8 bg-[#002856] rounded-md flex items-center justify-center text-white shrink-0 shadow-xs">
                            <Upload className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col justify-start items-center gap-1 text-center">
                            <span className="text-[#002856] text-xs font-semibold">
                              Tap to upload
                            </span>
                            <span className="text-[#002856]/80 text-xs font-normal">
                              Supported files: JPG, PNG
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-slate-300 rounded-lg bg-white p-3.5 shadow-2xs flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 truncate min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[#002856]/5 flex items-center justify-center text-[#002856] shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-semibold text-slate-800 truncate">
                              {file?.name || "Screenshot.png"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAttachmentPreviewModal(true)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer shrink-0"
                          >
                            View
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Field 4: Submit Ticket Button */}
                    <button
                      type="submit"
                      disabled={!isFormValid || submitting}
                      className={`w-full py-3 px-4 rounded-lg font-semibold text-base shadow-2xs flex items-center justify-center gap-2 transition-all ${
                        isFormValid && !submitting
                          ? "bg-[#002856] hover:bg-[#001e40] text-white cursor-pointer"
                          : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                      }`}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-white" />
                          <span>Submitting ticket...</span>
                        </>
                      ) : (
                        <span>Submit ticket</span>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Ticket History View */
                  <div className="space-y-4">
                    {loadingTickets ? (
                      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin text-[#002856] mb-2.5" />
                        <span className="text-xs font-medium">
                          Loading ticket history...
                        </span>
                      </div>
                    ) : tickets.length === 0 ? (
                      <div className="text-center py-16 px-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
                        <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                        <h4 className="text-slate-800 font-semibold text-sm">
                          No tickets found
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                          You haven't submitted any support requests yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tickets.map((ticket) => {
                          const isProcessing = [
                            "work_in_progress",
                            "resolved",
                          ].includes(ticket.status);
                          const isResolved = ticket.status === "resolved";
                          const formattedId = `TICKET-${String(ticket.ticket_id).padStart(2, "0")}`;
                          const formattedDate = new Date(
                            ticket.created_at,
                          ).toLocaleDateString("en-GB");

                          return (
                            <div
                              key={ticket.ticket_id}
                              className="bg-white border border-slate-100 rounded-3xl p-5 shadow-2xs space-y-4"
                            >
                              {/* Header Row */}
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <span className="text-xs font-medium text-slate-400 block">
                                    {formattedId}
                                  </span>
                                  <h4 className="font-bold text-slate-900 text-base leading-snug mt-1">
                                    {ticket.title}
                                  </h4>
                                  <span className="text-xs text-slate-400 block mt-0.5">
                                    {formattedDate}
                                  </span>
                                </div>
                                <div>{getStatusBadge(ticket.status)}</div>
                              </div>

                              {/* Stepper Progress Box */}
                              <div className="bg-black/5 rounded-2xl p-4 flex flex-col gap-3">
                                {/* Circles Row */}
                                <div className="flex items-center justify-between px-2">
                                  {/* Step 1: Submitted */}
                                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                    <Check className="w-4 h-4 text-white" />
                                  </div>

                                  <div className="flex-1 border-t-2 border-dashed border-slate-300 mx-2" />

                                  {/* Step 2: Processing */}
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                      isResolved
                                        ? "bg-emerald-500 text-white"
                                        : isProcessing
                                          ? "bg-[#002856] text-white"
                                          : "bg-white border-2 border-slate-300"
                                    }`}
                                  >
                                    {(isProcessing || isResolved) && (
                                      <Check className="w-4 h-4 text-white" />
                                    )}
                                  </div>

                                  <div className="flex-1 border-t-2 border-dashed border-slate-300 mx-2" />

                                  {/* Step 3: Resolved */}
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                      isResolved
                                        ? "bg-emerald-500 text-white"
                                        : "bg-white border-2 border-slate-300"
                                    }`}
                                  >
                                    {isResolved && (
                                      <Check className="w-4 h-4 text-white" />
                                    )}
                                  </div>
                                </div>

                                {/* Labels Row */}
                                <div className="grid grid-cols-3 text-center text-xs font-semibold text-slate-700">
                                  <div>Submitted</div>
                                  <div>Processing</div>
                                  <div>Resolved</div>
                                </div>
                              </div>

                              {/* Description Section */}
                              <div className="space-y-1">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                                  DESCRIPTION
                                </span>
                                <p className="text-sm font-normal text-slate-700 leading-relaxed whitespace-pre-wrap">
                                  {ticket.description}
                                </p>
                              </div>

                              {/* Attachment Section */}
                              {ticket.screenshot_url && (
                                <div className="space-y-2">
                                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                                    ATTACHMENT
                                  </span>
                                  <img
                                    src={ticket.screenshot_url}
                                    alt="Attachment"
                                    onClick={() =>
                                      setSelectedImage(ticket.screenshot_url)
                                    }
                                    className="w-20 h-24 object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Modal (Matching ProfilePage.jsx Upload Modal) */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none font-sans">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-5 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => {
                setUploadModalOpen(false);
                setTempSelectedFile(null);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-semibold text-[#002856] text-center">
              Upload Screenshot
            </h3>

            {/* Dropzone Box inside Modal */}
            <div
              onClick={() => modalFileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 hover:border-[#002856] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-black/5"
            >
              <div className="w-12 h-12 bg-[#002856] rounded-xl flex items-center justify-center text-white shrink-0 shadow-md">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-[#002856] text-sm font-semibold text-center">
                {tempSelectedFile ? tempSelectedFile.name : "Tap to upload"}
              </span>
               <span className="text-slate-400 text-xs font-normal">
                Supported files: JPG, PNG
              </span>
              <input
                ref={modalFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleModalFileSelect}
                className="hidden"
              />
            </div>

            <div className="flex flex-col gap-2.5 w-full">
              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={!tempSelectedFile}
                className="w-full py-3 bg-[#002856] hover:bg-[#001e40] text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer disabled:opacity-40"
              >
                Upload Screenshot
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadModalOpen(false);
                  setTempSelectedFile(null);
                }}
                className="w-full py-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal (Matching ProfilePage.jsx Document Preview Modal) */}
      {attachmentPreviewModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none font-sans">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-5 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setAttachmentPreviewModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-semibold text-[#002856] text-center">
              Screenshot Preview
            </h3>

            {/* Document Preview Container */}
            <div className="w-full h-80 rounded-2xl bg-black/5 overflow-hidden relative border border-slate-200 flex items-center justify-center p-2">
              {filePreview ? (
                <img
                  src={filePreview}
                  alt="Attachment preview"
                  className="w-full h-full object-contain rounded-xl"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <FileText className="w-10 h-10" />
                  <span className="text-xs font-medium">
                    Preview Unavailable
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 w-full">
              <button
                type="button"
                onClick={() => setAttachmentPreviewModal(false)}
                className="w-full py-3 bg-[#002856] hover:bg-[#001e40] text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
              >
                Okay
              </button>
              <button
                type="button"
                onClick={() => {
                  setAttachmentPreviewModal(false);
                  setTempSelectedFile(null);
                  setUploadModalOpen(true);
                }}
                className="w-full py-3 bg-white border border-slate-300 text-[#002856] hover:bg-slate-50 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
              >
                Re-upload Screenshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Overlay */}
      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-5 right-5 p-2 bg-slate-900/60 hover:bg-slate-950 text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <Motion.img
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              src={selectedImage}
              alt="Screenshot fullscreen"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
