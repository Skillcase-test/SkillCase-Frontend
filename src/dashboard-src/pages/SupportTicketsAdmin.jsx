import React, { useState, useEffect } from "react";
import { adminGetTickets, adminUpdateTicketStatus, adminUpdateTicketPriority } from "../../api/supportAdminApi";
import { Loader2, ExternalLink, RefreshCw, X, HelpCircle, CheckCircle2, Clock, AlertCircle, Search, User, Phone, Calendar, Award } from "lucide-react";
import toast from "react-hot-toast";

export default function SupportTicketsAdmin() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTickets = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await adminGetTickets();
      if (res.data?.success) {
        setTickets(res.data.tickets || []);
      }
    } catch (err) {
      console.error("Failed to load admin tickets:", err);
      toast.error("Failed to fetch tickets");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleStatusChange = async (ticketId, newStatus) => {
    setUpdatingId(ticketId);
    try {
      const res = await adminUpdateTicketStatus(ticketId, newStatus);
      if (res.data?.success) {
        toast.success("Ticket status updated");
        setTickets((prev) =>
          prev.map((t) =>
            t.ticket_id === ticketId ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t
          )
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePriorityChange = async (ticketId, newPriority) => {
    setUpdatingId(ticketId);
    try {
      const res = await adminUpdateTicketPriority(ticketId, newPriority);
      if (res.data?.success) {
        toast.success("Priority level updated");
        setTickets((prev) =>
          prev.map((t) =>
            t.ticket_id === ticketId ? { ...t, priority: newPriority, updated_at: new Date().toISOString() } : t
          )
        );
      }
    } catch (err) {
      console.error("Failed to update priority:", err);
      toast.error("Failed to update priority");
    } finally {
      setUpdatingId(null);
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

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "high":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fff1f2] text-[#e11d48] border border-[#fecdd3]">
            High Priority
          </span>
        );
      case "low":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0]">
            Low Priority
          </span>
        );
      case "medium":
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fef8e7] text-[#b25e00] border border-[#fbecc8]">
            Medium Priority
          </span>
        );
    }
  };

  const renderStatusActions = (ticket) => {
    if (updatingId === ticket.ticket_id) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-[#002856] bg-slate-50 border border-slate-100 rounded-lg">
          <Loader2 className="w-3 h-3 animate-spin text-[#002856]" />
          Updating...
        </div>
      );
    }

    switch (ticket.status) {
      case "notified":
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStatusChange(ticket.ticket_id, "work_in_progress")}
              className="px-3 py-1 text-[10px] font-bold rounded-lg border border-[#ccd9e8] bg-white text-[#002856] hover:bg-[#eef2f6] transition-colors cursor-pointer"
            >
              Start Progress
            </button>
            <button
              onClick={() => handleStatusChange(ticket.ticket_id, "resolved")}
              className="px-3 py-1 text-[10px] font-bold rounded-lg border border-[#c3ebc6] bg-[#eaf7f0] text-[#1e7e34] hover:bg-[#d6f5df] transition-colors cursor-pointer"
            >
              Resolve
            </button>
          </div>
        );
      case "work_in_progress":
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStatusChange(ticket.ticket_id, "resolved")}
              className="px-3 py-1 text-[10px] font-bold rounded-lg border border-transparent bg-[#1e7e34] text-white hover:bg-[#155a24] transition-colors cursor-pointer shadow-sm"
            >
              Resolve Issue
            </button>
            <button
              onClick={() => handleStatusChange(ticket.ticket_id, "notified")}
              className="px-3 py-1 text-[10px] font-bold rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Mark Submitted
            </button>
          </div>
        );
      case "resolved":
        return (
          <button
            onClick={() => handleStatusChange(ticket.ticket_id, "work_in_progress")}
            className="px-3 py-1 text-[10px] font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Reopen Ticket
          </button>
        );
      default:
        return null;
    }
  };

  // Compute status counts for display badges
  const counts = {
    all: tickets.length,
    notified: tickets.filter((t) => t.status === "notified").length,
    work_in_progress: tickets.filter((t) => t.status === "work_in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesFilter = statusFilter === "all" || t.status === statusFilter;
    const matchesSearch =
      t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone?.includes(searchQuery) ||
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Sort tickets: High priority first, then Medium, then Low
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    const weightA = priorityWeight[a.priority || "medium"];
    const weightB = priorityWeight[b.priority || "medium"];
    return weightB - weightA;
  });

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header card with clean visual layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800">Support Center</h1>
          <p className="text-xs text-slate-400">Review candidate reports, track issues, and manage resolution states</p>
        </div>
        <button
          onClick={() => fetchTickets()}
          disabled={loading}
          className="flex items-center justify-center gap-2 self-start md:self-auto px-4 py-2.5 border border-slate-200 hover:border-[#002856] text-slate-600 hover:text-[#002856] font-bold text-xs rounded-xl bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh tickets
        </button>
      </div>

      {/* Control Panel (Search and Filters) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        {/* Left: Filter Tabs with counters */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "All Issues", count: counts.all },
            { key: "notified", label: "Submitted", count: counts.notified },
            { key: "work_in_progress", label: "In Progress", count: counts.work_in_progress },
            { key: "resolved", label: "Resolved", count: counts.resolved },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
                statusFilter === tab.key
                  ? "bg-[#002856] text-white border-[#002856] shadow-sm"
                  : "bg-slate-50 text-slate-500 border-slate-200/80 hover:bg-slate-100"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                statusFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right: Search Box */}
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate, phone or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#002856]/5 focus:border-[#002856] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tickets List */}
      {loading && tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white border border-slate-100 rounded-2xl">
          <Loader2 className="w-10 h-10 animate-spin text-[#002856] mb-3" />
          <span className="text-xs">Loading support tickets...</span>
        </div>
      ) : sortedTickets.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-100 rounded-2xl p-6">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-slate-600 font-bold text-sm">No tickets found</h3>
          <p className="text-xs text-slate-400 mt-1">There are no support tickets matching your search or filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedTickets.map((ticket) => (
            <div
              key={ticket.ticket_id}
              className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
            >
              {/* Top Row: Meta-Header (Hierarchy Separator) */}
              <div className="px-6 py-3.5 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded-lg font-bold bg-[#eef2f6] text-[#002856] text-[10px]">
                    TICKET #{ticket.ticket_id}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Raised: {new Date(ticket.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* State Badge, Priority Select, and State Actions */}
                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                  {/* Priority display and modifier */}
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(ticket.priority || "medium")}
                    <select
                      value={ticket.priority || "medium"}
                      onChange={(e) => handlePriorityChange(ticket.ticket_id, e.target.value)}
                      disabled={updatingId === ticket.ticket_id}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#002856] cursor-pointer"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>

                  <div className="hidden md:block h-4 w-px bg-slate-200" />

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
                    {getStatusBadge(ticket.status)}
                  </div>

                  <div className="hidden md:block h-4 w-px bg-slate-200" />

                  {/* Status Actions */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actions:</span>
                    {renderStatusActions(ticket)}
                  </div>
                </div>
              </div>

              {/* Main row: Split candidate vs issue details */}
              <div className="p-6 flex flex-col lg:flex-row gap-6">
                {/* Left side: Candidate Info profile card */}
                <div className="lg:w-60 flex-shrink-0 bg-slate-50/30 border border-slate-100 rounded-xl p-4 self-start space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <User className="w-4 h-4 text-[#002856]" />
                    <span className="font-bold text-slate-800 text-xs truncate">{ticket.name}</span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ticket.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-slate-400" />
                      <span className="px-1.5 py-0.5 rounded font-bold bg-[#eef2f6] text-[#002856] text-[10px]">
                        {ticket.proficiency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side: Detailed ticket summary description */}
                <div className="flex-1 space-y-3 pl-0 lg:pl-2 border-l-0 lg:border-l lg:border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 leading-snug">{ticket.title}</h3>
                  <div className="pl-3.5 border-l-2 border-[#002856]/40">
                    <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {ticket.description}
                    </p>
                  </div>

                  {ticket.screenshot_url && (
                    <div className="pt-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Attached screenshot</span>
                      <div className="inline-block relative group border border-slate-100 rounded-lg overflow-hidden cursor-zoom-in">
                        <img
                          src={ticket.screenshot_url}
                          alt="Supporting attachment"
                          onClick={() => setSelectedImage(ticket.screenshot_url)}
                          className="h-20 max-w-sm object-cover hover:opacity-85 transition-all"
                        />
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ExternalLink className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-5 right-5 p-2 bg-slate-900/60 hover:bg-slate-950 text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedImage}
            alt="Fullscreen attachment preview"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
