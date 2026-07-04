import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Image as ImageIcon, Loader2, Plus, Clock, History, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { raiseTicket, getUserTickets, uploadScreenshot } from "../api/supportApi";
import toast from "react-hot-toast";

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
  const [expandedTicketId, setExpandedTicketId] = useState(null); // Accordion state
  const fileInputRef = useRef(null);

  // Check if we are on landing page, learn german home, or job screening home
  const showSupport =
    location.pathname === "/" ||
    location.pathname === "/learn-german" ||
    location.pathname === "/job-screening";

  // Position dynamically to avoid overlapping the BottomModeSwitcher
  const hasSwitcher = location.pathname === "/" || location.pathname === "/learn-german";
  const widgetBottomStyle = hasSwitcher
    ? "bottom-[84px] md:bottom-[92px]"
    : "bottom-[24px]";

  const fetchTickets = async (silent = false) => {
    if (!silent) setLoadingTickets(true);
    try {
      const res = await getUserTickets();
      if (res.data?.success) {
        setTickets(res.data.tickets || []);
      }
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      if (!silent) setLoadingTickets(false);
    }
  };

  // Poll for status updates while support panel is open
  useEffect(() => {
    if (!isOpen) return;
    fetchTickets(tickets.length > 0);
    const timer = setInterval(() => {
      fetchTickets(true);
    }, 10000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith("image/")) {
        toast.error("Only image files are allowed");
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("Maximum file size is 5MB");
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
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
      toast.error("Title and description are required");
      return;
    }

    setSubmitting(true);
    let screenshotUrl = null;

    try {
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
        toast.success("Support ticket raised successfully");
        setTitle("");
        setDescription("");
        handleRemoveFile();
        fetchTickets(true);
        setActiveTab("history");
        setExpandedTicketId(ticketRes.data.ticket?.ticket_id || null);
      }
    } catch (err) {
      console.error("Error raising ticket:", err);
      toast.error(err.response?.data?.error || "Failed to raise support ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "work_in_progress":
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#eef2f6] text-[#002856] border border-[#ccd9e8]">
            <Clock className="w-3 h-3 animate-spin" />
            In Progress
          </span>
        );
      case "resolved":
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#eaf7f0] text-[#1e7e34] border border-[#c3ebc6]">
            <CheckCircle2 className="w-3 h-3" />
            Resolved
          </span>
        );
      case "notified":
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fef8e7] text-[#b25e00] border border-[#fbecc8]">
            <AlertCircle className="w-3 h-3" />
            Submitted
          </span>
        );
    }
  };

  const toggleExpandTicket = (ticketId) => {
    setExpandedTicketId(expandedTicketId === ticketId ? null : ticketId);
  };

  if (!showSupport) return null;

  return (
    <>
      {/* Floating Trigger Button */}
      <div className={`fixed right-5 ${widgetBottomStyle} z-[99] transition-all duration-300`}>
        <motion.button
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center w-14 h-14 bg-[#002856] text-white rounded-full shadow-[0_8px_30px_rgba(0,40,86,0.3)] hover:brightness-110 focus:outline-none cursor-pointer"
        >
          <MessageSquare className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Support Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
            />

            {/* Sidebar Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 240 }}
              className="relative w-full max-w-md h-full bg-[#f8fafc] shadow-2xl flex flex-col z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 bg-white border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#eef2f6] text-[#002856] rounded-xl">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base leading-none">Support & Help</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Ask questions and track resolutions</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex bg-white px-5 border-b border-slate-100">
                <button
                  onClick={() => setActiveTab("new")}
                  className={`flex-1 py-3.5 text-xs font-bold border-b-2 text-center transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === "new"
                      ? "border-[#002856] text-[#002856]"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  New Ticket
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`flex-1 py-3.5 text-xs font-bold border-b-2 text-center transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === "history"
                      ? "border-[#002856] text-[#002856]"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <History className="w-4 h-4" />
                  Ticket History
                </button>
              </div>

              {/* Content Panel */}
              <div className="flex-1 overflow-y-auto p-5">
                {activeTab === "new" ? (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                        Title / Issue Heading *
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Payment failed or Chapter not loading"
                        className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200/80 rounded-xl text-slate-700 text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#002856]/5 focus:border-[#002856] transition-all"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                        Description / Details *
                      </label>
                      <textarea
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Please describe what you were doing and what went wrong. Include error messages if any..."
                        className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200/80 rounded-xl text-slate-700 text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#002856]/5 focus:border-[#002856] transition-all resize-none leading-relaxed"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                        Attach Screenshot (Optional)
                      </label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                        disabled={submitting}
                      />

                      {!filePreview ? (
                        <div
                          onClick={() => !submitting && fileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-[#002856]/50 bg-white hover:bg-slate-50/30 p-8 rounded-2xl cursor-pointer transition-all duration-200"
                        >
                          <div className="p-3 bg-[#eef2f6] text-[#002856] rounded-full mb-3">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold text-slate-600">Choose screenshot</span>
                          <span className="text-[10px] text-slate-400 mt-1">PNG, JPG or JPEG up to 5MB</span>
                        </div>
                      ) : (
                        <div className="relative border border-slate-200/80 rounded-2xl overflow-hidden bg-white p-2">
                          <img
                            src={filePreview}
                            alt="Screenshot preview"
                            className="w-full max-h-48 object-contain rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="absolute top-4 right-4 p-1.5 bg-slate-900/80 hover:bg-slate-950 text-white rounded-full transition-colors cursor-pointer"
                            disabled={submitting}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 bg-[#002856] hover:bg-[#001e40] text-white font-bold text-xs py-3.5 px-4 rounded-xl shadow-md hover:shadow-[0_8px_20px_rgba(0,40,86,0.15)] disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting Ticket...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit Ticket
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3">
                    {loadingTickets ? (
                      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin text-[#002856] mb-2.5" />
                        <span className="text-xs">Loading ticket history...</span>
                      </div>
                    ) : tickets.length === 0 ? (
                      <div className="text-center py-16 px-4 bg-white border border-slate-100 rounded-2xl">
                        <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                        <h4 className="text-slate-700 font-bold text-sm">No tickets found</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                          You haven't submitted any support requests yet. Fill in the New Ticket tab to get help.
                        </p>
                      </div>
                    ) : (
                      <motion.div
                        layout
                        className="space-y-3"
                      >
                        {tickets.map((ticket) => {
                          const isExpanded = expandedTicketId === ticket.ticket_id;
                          return (
                            <motion.div
                              layout
                              key={ticket.ticket_id}
                              className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden"
                            >
                              {/* Header Card (Always Visible) */}
                              <div
                                onClick={() => toggleExpandTicket(ticket.ticket_id)}
                                className="p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-50/40 transition-colors"
                              >
                                <div className="space-y-1">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Ticket #{ticket.ticket_id}
                                  </span>
                                  <h4 className="font-bold text-slate-700 text-sm leading-snug">
                                    {ticket.title}
                                  </h4>
                                  <span className="text-[10px] text-slate-400 block pt-0.5">
                                    {new Date(ticket.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex flex-col items-end gap-2.5">
                                  {getStatusBadge(ticket.status)}
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                              </div>

                              {/* Expanded Panel (Timeline & Details) */}
                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: "auto" }}
                                    exit={{ height: 0 }}
                                    className="overflow-hidden border-t border-slate-50 bg-[#fafbfe]/30"
                                  >
                                    <div className="p-4 space-y-4">
                                      {/* Micro-Timeline Stepper */}
                                      <div className="flex items-center justify-between px-3 py-2 bg-slate-50/50 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-1.5">
                                          <div className={`w-2.5 h-2.5 rounded-full ${ticket.status === "notified" || ticket.status === "work_in_progress" || ticket.status === "resolved" ? "bg-amber-500" : "bg-slate-200"}`} />
                                          <span className="text-[9px] font-bold text-slate-500">Submitted</span>
                                        </div>
                                        <div className="flex-1 h-0.5 bg-slate-200 mx-2" />
                                        <div className="flex items-center gap-1.5">
                                          <div className={`w-2.5 h-2.5 rounded-full ${ticket.status === "work_in_progress" || ticket.status === "resolved" ? "bg-[#002856]" : "bg-slate-200"}`} />
                                          <span className="text-[9px] font-bold text-slate-500">Processing</span>
                                        </div>
                                        <div className="flex-1 h-0.5 bg-slate-200 mx-2" />
                                        <div className="flex items-center gap-1.5">
                                          <div className={`w-2.5 h-2.5 rounded-full ${ticket.status === "resolved" ? "bg-emerald-500" : "bg-slate-200"}`} />
                                          <span className="text-[9px] font-bold text-slate-500">Resolved</span>
                                        </div>
                                      </div>

                                      <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Description</span>
                                        <p className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed">
                                          {ticket.description}
                                        </p>
                                      </div>

                                      {ticket.screenshot_url && (
                                        <div className="space-y-1.5">
                                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Attachment</span>
                                          <img
                                            src={ticket.screenshot_url}
                                            alt="Support screenshot"
                                            onClick={() => setSelectedImage(ticket.screenshot_url)}
                                            className="h-16 w-24 object-cover rounded-lg border border-slate-100 hover:opacity-85 cursor-zoom-in transition-opacity"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
            <motion.img
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
