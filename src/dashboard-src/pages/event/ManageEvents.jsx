import { useEffect, useState } from "react";

import api from "../../../api/axios.js";
import axios from "axios";

import {
  Calendar,
  Users,
  Plus,
  Edit2,
  Trash2,
  Star,
  X,
  Loader2,
  Check,
  RotateCcw,
  AlertTriangle,
  Upload,
  Copy,
} from "lucide-react";

// Toast Component
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor =
    type === "success"
      ? "bg-green-600"
      : type === "error"
      ? "bg-red-600"
      : "bg-blue-600";

  return (
    <div
      className={`fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-slide-up`}
    >
      {type === "success" && <Check size={18} />}
      {type === "error" && <AlertTriangle size={18} />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <X size={16} />
      </button>
    </div>
  );
}

// Delete Modal Component
function DeleteModal({
  event,
  isOpen,
  onClose,
  onSoftDelete,
  onPermanentDelete,
  onRestore,
}) {
  if (!isOpen || !event) return null;

  const isDeleted = event.is_active === false;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 className="text-red-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {isDeleted ? "Manage Deleted Event" : "Delete Event"}
            </h3>
            <p className="text-sm text-gray-600">{event.title}</p>
          </div>
        </div>
        <div className="space-y-3">
          {isDeleted ? (
            <>
              {/* Restore Option */}
              <button
                onClick={onRestore}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 transition text-left"
              >
                <RotateCcw className="text-green-600" size={20} />
                <div>
                  <div className="font-semibold text-green-700">
                    Restore Event
                  </div>
                  <div className="text-sm text-green-600">
                    Make this event active again
                  </div>
                </div>
              </button>

              {/* Permanent Delete Option */}
              <button
                onClick={onPermanentDelete}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 transition text-left"
              >
                <AlertTriangle className="text-red-600" size={20} />
                <div>
                  <div className="font-semibold text-red-700">
                    Delete Permanently
                  </div>
                  <div className="text-sm text-red-600">
                    Remove event and all registrations forever
                  </div>
                </div>
              </button>
            </>
          ) : (
            <>
              {/* Soft Delete Option */}
              <button
                onClick={onSoftDelete}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition text-left"
              >
                <Trash2 className="text-yellow-600" size={20} />
                <div>
                  <div className="font-semibold text-yellow-700">
                    Archive Event
                  </div>
                  <div className="text-sm text-yellow-600">
                    Hide from public, can restore later
                  </div>
                </div>
              </button>
              {/* Permanent Delete Option */}
              <button
                onClick={onPermanentDelete}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 transition text-left"
              >
                <AlertTriangle className="text-red-600" size={20} />
                <div>
                  <div className="font-semibold text-red-700">
                    Delete Permanently
                  </div>
                  <div className="text-sm text-red-600">
                    Cannot be recovered
                  </div>
                </div>
              </button>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Edit Modal Component
function EditChoiceModal({
  event,
  isOpen,
  onClose,
  onEditAll,
  onEditInstance,
}) {
  const [mode, setMode] = useState("choice"); // choice | instance
  const [selectedDate, setSelectedDate] = useState("");
  const [customStartTime, setCustomStartTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");
  const [saving, setSaving] = useState(false);
  if (!isOpen || !event) return null;
  const handleSaveInstance = async () => {
    if (!selectedDate || !customStartTime || !customEndTime) {
      alert("Please fill all fields");
      return;
    }
    setSaving(true);
    await onEditInstance({
      instance_date: selectedDate,
      custom_start_time: customStartTime,
      custom_end_time: customEndTime,
    });
    setSaving(false);
    setMode("choice");
    onClose();
  };
  const resetAndClose = () => {
    setMode("choice");
    setSelectedDate("");
    setCustomStartTime("");
    setCustomEndTime("");
    onClose();
  };
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={resetAndClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {mode === "choice" ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Edit2 className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Edit Recurring Event
                </h3>
                <p className="text-sm text-gray-600">{event.title}</p>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={onEditAll}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition text-left"
              >
                <Calendar className="text-blue-600" size={20} />
                <div>
                  <div className="font-semibold text-blue-700">
                    Edit All Instances
                  </div>
                  <div className="text-sm text-blue-600">
                    Modify the base event for all days
                  </div>
                </div>
              </button>
              <button
                onClick={() => setMode("instance")}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 transition text-left"
              >
                <Edit2 className="text-purple-600" size={20} />
                <div>
                  <div className="font-semibold text-purple-700">
                    Edit Specific Day
                  </div>
                  <div className="text-sm text-purple-600">
                    Change time for a particular day only
                  </div>
                </div>
              </button>
            </div>
            <button
              onClick={resetAndClose}
              className="w-full mt-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Override Instance Time
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004E92]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004E92]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004E92]"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveInstance}
                  disabled={saving}
                  className="flex-1 bg-[#004E92] text-white py-3 rounded-xl font-semibold hover:bg-[#003d73] transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Override"}
                </button>
                <button
                  onClick={() => setMode("choice")}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
                >
                  Back
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Preset RRULE Options
const PRESET_RRULES = [
  { label: "Daily (7 days)", value: `FREQ=DAILY;COUNT=7` },
  { label: "Daily (30 days)", value: `FREQ=DAILY;COUNT=30` },
  { label: "Weekly (Mon, Wed, Fri)", value: "FREQ=WEEKLY;BYDAY=MO,WE,FR" },
  { label: "Weekly (Every Monday)", value: "FREQ=WEEKLY;BYDAY=MO" },
  { label: "Monthly (1st of month)", value: "FREQ=MONTHLY;BYMONTHDAY=1" },
  { label: "Custom", value: "custom" },
];

export default function ManageEvents({ useAccessCodeAuth = false }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteModalEvent, setDeleteModalEvent] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [eventDuration, setEventDuration] = useState("60"); // minutes
  const [showEditChoice, setShowEditChoice] = useState(false);
  const [editChoiceEvent, setEditChoiceEvent] = useState(null);
  const [copiedEventId, setCopiedEventId] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    cover_image_url: "",
    is_featured: false,
    meeting_link: "",
    event_type: "one_time",
    start_datetime: "",
    end_datetime: "",
    timezone: "Asia/Kolkata",
    recurrence_rule: "",
    recurrence_timezone: "Asia/Kolkata",
  });

  const [showRegistrations, setShowRegistrations] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  const getApi = () => {
    if (useAccessCodeAuth) {
      const code = sessionStorage.getItem("event_access_code");
      const instance = axios.create({
        baseURL: import.meta.env.VITE_BACKEND_URL,
      });
      instance.interceptors.request.use((config) => {
        config.headers["x-access-code"] = code;
        return config;
      });
      return instance;
    }
    return api;
  };
  const activeApi = getApi();

  useEffect(() => {
    fetchEvents();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const fetchEvents = async () => {
    try {
      const res = await activeApi.get("/admin/events");
      setEvents(res.data.events || []);
    } catch (err) {
      console.error("Error fetching events:", err);
      showToast("Failed to load events", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setEditingEvent(null);
    setSelectedPreset("");
    setFormData({
      title: "",
      slug: "",
      description: "",
      cover_image_url: "",
      is_featured: false,
      meeting_link: "",
      event_type: "one_time",
      start_datetime: "",
      end_datetime: "",
      timezone: "Asia/Kolkata",
      recurrence_rule: "",
      recurrence_timezone: "Asia/Kolkata",
    });
    setShowModal(true);
  };

  const handleEditClick = (event) => {
    setEditingEvent(event);

    // Helper function to convert UTC datetime to local datetime string for datetime-local input
    const toLocalDateTimeString = (utcDatetime) => {
      if (!utcDatetime) return "";
      const date = new Date(utcDatetime);
      // Get local time components
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setFormData({
      title: event.title,
      slug: event.slug,
      description: event.description || "",
      cover_image_url: event.cover_image_url || "",
      is_featured: event.is_featured,
      meeting_link: event.meeting_link,
      event_type: event.event_type,
      start_datetime: toLocalDateTimeString(event.start_datetime),
      end_datetime: toLocalDateTimeString(event.end_datetime),
      timezone: event.timezone || "Asia/Kolkata",
      recurrence_rule: event.recurrence_rule || "",
      recurrence_timezone: event.recurrence_timezone || "Asia/Kolkata",
    });
    setShowModal(true);
  };

  const handleInstanceOverride = async (overrideData) => {
    try {
      await activeApi.post(
        `/admin/events/${editChoiceEvent.event_id}/override`,
        overrideData
      );
      showToast("Instance time overridden successfully!");
      fetchEvents();
    } catch (err) {
      console.error("Error creating override:", err);
      showToast("Failed to override instance", "error");
    }
  };
  const handleEditButtonClick = (event) => {
    if (event.event_type === "recurring") {
      setEditChoiceEvent(event);
      setShowEditChoice(true);
    } else {
      handleEditClick(event);
    }
  };

  // Helper: Convert datetime-local string to UTC ISO string
  const localToUTC = (datetimeLocal) => {
    if (!datetimeLocal) return "";
    // datetime-local value is in user's browser timezone
    // Convert to UTC for backend
    const date = new Date(datetimeLocal);
    return date.toISOString();
  };
  // Helper: Convert UTC ISO string to datetime-local format
  const utcToLocal = (utcDatetime) => {
    if (!utcDatetime) return "";
    const date = new Date(utcDatetime);
    // Format for datetime-local input: YYYY-MM-DDTHH:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Convert local times to UTC before sending
      const payload = {
        ...formData,
        start_datetime: localToUTC(formData.start_datetime),
        end_datetime: formData.end_datetime
          ? localToUTC(formData.end_datetime)
          : "",
      };

      if (editingEvent) {
        await activeApi.put(`/admin/events/${editingEvent.event_id}`, payload);
        showToast("Event updated successfully!");
      } else {
        await activeApi.post("/admin/events", payload);
        showToast("Event created successfully!");
      }
      setShowModal(false);
      fetchEvents();
    } catch (err) {
      console.error("Error saving event:", err);
      showToast("Failed to save event", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (event) => {
    setDeleteModalEvent(event);
    setShowDeleteModal(true);
  };

  const handleSoftDelete = async () => {
    if (!deleteModalEvent) return;
    try {
      await activeApi.delete(`/admin/events/${deleteModalEvent.event_id}`);
      showToast("Event archived successfully!");
      setShowDeleteModal(false);
      fetchEvents();
    } catch (err) {
      showToast("Failed to archive event", "error");
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteModalEvent) return;
    if (!window.confirm("Are you absolutely sure? This cannot be undone!"))
      return;

    try {
      await activeApi.delete(
        `/admin/events/${deleteModalEvent.event_id}/permanent`
      );
      showToast("Event permanently deleted!");
      setShowDeleteModal(false);
      fetchEvents();
    } catch (err) {
      showToast("Failed to delete event", "error");
    }
  };

  const handleRestore = async () => {
    if (!deleteModalEvent) return;
    try {
      await activeApi.put(`/admin/events/${deleteModalEvent.event_id}/restore`);
      showToast("Event restored successfully!");
      setShowDeleteModal(false);
      fetchEvents();
    } catch (err) {
      showToast("Failed to restore event", "error");
    }
  };

  const handleToggleFeatured = async (event) => {
    try {
      await activeApi.put(`/admin/events/${event.event_id}`, {
        is_featured: !event.is_featured,
      });
      showToast(
        event.is_featured ? "Removed from featured" : "Set as featured!"
      );
      fetchEvents();
    } catch (err) {
      showToast("Failed to update featured status", "error");
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    // If start_datetime changes for recurring event, recalculate end_datetime
    if (
      name === "start_datetime" &&
      formData.event_type === "recurring" &&
      value
    ) {
      const start = new Date(value);
      start.setMinutes(start.getMinutes() + parseInt(eventDuration || 60));
      setFormData({
        ...formData,
        [name]: newValue,
        end_datetime: start.toISOString().slice(0, 16),
      });
    } else {
      setFormData({
        ...formData,
        [name]: newValue,
      });
    }
  };

  const handlePresetChange = (preset) => {
    setSelectedPreset(preset);
    if (preset === "custom") {
      setFormData({ ...formData, recurrence_rule: "" });
    } else if (preset) {
      setFormData({ ...formData, recurrence_rule: preset });
    }
  };

  const handleViewRegistrations = async (eventId) => {
    setSelectedEventId(eventId);
    setLoadingRegistrations(true);
    setRegistrations([]); // Clear previous registrations
    setShowRegistrations(true); // Show modal immediately with loader
    try {
      const res = await activeApi.get(`/admin/events/${eventId}/registrations`);
      setRegistrations(res.data.registrations || []);
    } catch (err) {
      console.error("Error fetching registrations:", err);
      showToast("Failed to load registrations", "error");
    } finally {
      setLoadingRegistrations(false);
    }
  };


  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("image", file);
      const res = await activeApi.post(
        "/admin/events/upload-image",
        formDataUpload,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      if (res.data.success) {
        setFormData({ ...formData, cover_image_url: res.data.url });
        showToast("Image uploaded successfully!");
      }
    } catch (err) {
      console.error("Image upload error:", err);
      showToast("Failed to upload image", "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCopyLink = (event) => {
    const eventUrl = `${window.location.origin}/events/${event.slug}`;
    navigator.clipboard.writeText(eventUrl);
    setCopiedEventId(event.event_id);
    showToast("Event link copied to clipboard!");
    setTimeout(() => setCopiedEventId(null), 2000);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#004E92]" size={32} />
        <span className="ml-3 text-lg text-gray-600">Loading events...</span>
      </div>
    );
  }

  // Split events into active and archived
  const activeEvents = events.filter((e) => e.is_active !== false);
  const archivedEvents = events.filter((e) => e.is_active === false);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#004E92]">Manage Events</h1>
          <p className="text-gray-600 mt-1">
            {activeEvents.length} active • {archivedEvents.length} archived
          </p>
        </div>
        <button
          onClick={handleCreateClick}
          className="flex items-center gap-2 bg-[#004E92] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#003d73] transition shadow-md"
        >
          <Plus size={20} />
          Create Event
        </button>
      </div>

      {/* Active Events */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="font-semibold text-gray-700">Active Events</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                Title
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                Featured
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                Date
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                Registrations
              </th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {activeEvents.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                  No active events. Create one to get started!
                </td>
              </tr>
            ) : (
              activeEvents.map((event) => (
                <tr
                  key={event.event_id}
                  className="hover:bg-gray-50 transition"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {event.title}
                    </div>
                    <div className="text-sm text-gray-500">{event.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleFeatured(event)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition ${
                        event.is_featured
                          ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <Star
                        size={14}
                        className={event.is_featured ? "fill-yellow-800" : ""}
                      />
                      {event.is_featured ? "Featured" : "Set Featured"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {event.event_type === "recurring" ? (
                      <span className="text-blue-600 font-medium">
                        Recurring
                      </span>
                    ) : event.start_datetime ? (
                      new Date(event.start_datetime).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )
                    ) : (
                      "TBA"
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                      <Users size={16} />
                      {event.registration_count || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleCopyLink(event)}
                        className={`p-2 rounded-lg transition ${
                          copiedEventId === event.event_id
                            ? "text-green-600 bg-green-50"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                        title="Copy event link"
                      >
                        {copiedEventId === event.event_id ? (
                          <Check size={18} />
                        ) : (
                          <Copy size={18} />
                        )}
                      </button>
                      <button
                        onClick={() => handleEditButtonClick(event)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(event)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => handleViewRegistrations(event.event_id)}
                        className="px-3 py-2 text-sm bg-green-50 text-green-700 hover:bg-green-100 rounded-lg font-medium transition"
                      >
                        Registrations
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Archived Events */}
      {archivedEvents.length > 0 && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
          <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-200">
            <h2 className="font-semibold text-yellow-800">Archived Events</h2>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-gray-200">
              {archivedEvents.map((event) => (
                <tr key={event.event_id} className="bg-gray-50 opacity-75">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-700">
                      {event.title}
                    </div>
                    <div className="text-sm text-gray-500">{event.slug}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {event.registration_count || 0} registrations
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteClick(event)}
                      className="px-4 py-2 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-medium transition"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteModal
        event={deleteModalEvent}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onSoftDelete={handleSoftDelete}
        onPermanentDelete={handlePermanentDelete}
        onRestore={handleRestore}
      />

      {/* Edit Choice Modal for Recurring Events */}
      <EditChoiceModal
        event={editChoiceEvent}
        isOpen={showEditChoice}
        onClose={() => setShowEditChoice(false)}
        onEditAll={() => {
          setShowEditChoice(false);
          handleEditClick(editChoiceEvent);
        }}
        onEditInstance={handleInstanceOverride}
      />

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex justify-between items-center">
              <h2 className="text-2xl font-bold text-[#004E92]">
                {editingEvent ? "Edit Event" : "Create New Event"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004E92]"
                  placeholder="German Language Workshop"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004E92]"
                  placeholder="german-language-workshop (auto-generated)"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004E92] min-h-64"
                  placeholder="Write your event description here...
Formatting tips:
**bold text** for emphasis
*italic text* for subtle emphasis
- bullet point
[link text](https://url.com)
Leave an empty line for a new paragraph."
                />
              </div>

              {/* Cover Image & Meeting Link */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cover Image
                  </label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        name="cover_image_url"
                        value={formData.cover_image_url}
                        onChange={handleInputChange}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004E92]"
                        placeholder="https://... or upload below"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition">
                        <Upload size={18} />
                        <span className="text-sm font-medium">
                          {uploadingImage ? "Uploading..." : "Upload Image"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                      </label>
                      {formData.cover_image_url && (
                        <img
                          src={formData.cover_image_url}
                          alt="Preview"
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Meeting Link *
                  </label>
                  <input
                    type="url"
                    name="meeting_link"
                    value={formData.meeting_link}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004E92]"
                    placeholder="https://meet.google.com/..."
                  />
                </div>
              </div>

              {/* Featured */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_featured"
                  id="is_featured"
                  checked={formData.is_featured}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-[#004E92] border-gray-300 rounded focus:ring-[#004E92]"
                />
                <label
                  htmlFor="is_featured"
                  className="text-sm font-semibold text-gray-700"
                >
                  Featured Event
                </label>
              </div>

              {/* Event Type */}
              <div className="bg-gray-50 p-4 rounded-xl space-y-4">
                <label className="block text-sm font-semibold text-gray-700">
                  Event Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="event_type"
                      value="one_time"
                      checked={formData.event_type === "one_time"}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-[#004E92]"
                    />
                    <span>One-time Event</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="event_type"
                      value="recurring"
                      checked={formData.event_type === "recurring"}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-[#004E92]"
                    />
                    <span>Recurring Event</span>
                  </label>
                </div>

                {formData.event_type === "one_time" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Start *
                      </label>
                      <input
                        type="datetime-local"
                        name="start_datetime"
                        value={formData.start_datetime}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004E92]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        End *
                      </label>
                      <input
                        type="datetime-local"
                        name="end_datetime"
                        value={formData.end_datetime}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004E92]"
                      />
                    </div>
                  </div>
                )}

                {formData.event_type === "recurring" && (
                  <div className="space-y-3">
                    {/* Start Date & Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        First Event Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        name="start_datetime"
                        value={formData.start_datetime}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004E92]"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        When does the first session start? Same time applies to
                        all instances.
                      </p>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Event Duration
                      </label>
                      <select
                        value={eventDuration}
                        onChange={(e) => {
                          setEventDuration(e.target.value);
                          // Calculate end_datetime based on duration
                          if (formData.start_datetime) {
                            const start = new Date(formData.start_datetime);
                            start.setMinutes(
                              start.getMinutes() + parseInt(e.target.value)
                            );
                            setFormData({
                              ...formData,
                              end_datetime: start.toISOString().slice(0, 16),
                            });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004E92]"
                      >
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="90">1.5 hours</option>
                        <option value="120">2 hours</option>
                        <option value="180">3 hours</option>
                      </select>
                    </div>

                    {/* Recurrence Pattern */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Quick Presets
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_RRULES.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => handlePresetChange(preset.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                              selectedPreset === preset.value ||
                              formData.recurrence_rule === preset.value
                                ? "bg-[#004E92] text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        RRULE
                      </label>
                      <input
                        type="text"
                        name="recurrence_rule"
                        value={formData.recurrence_rule}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004E92] font-mono text-sm"
                        placeholder="FREQ=DAILY;COUNT=7"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Format: FREQ=DAILY|WEEKLY|MONTHLY, COUNT=n or
                        UNTIL=YYYYMMDD
                      </p>
                    </div>
                  </div>
                )}

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Timezone
                  </label>
                  <select
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004E92]"
                  >
                    <option value="Asia/Kolkata">IST (India)</option>
                    <option value="Europe/Berlin">CET (Germany)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#004E92] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#003d73] transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      {editingEvent ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      {editingEvent ? "Update Event" : "Create Event"}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Registrations Modal */}
      {showRegistrations && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex justify-between items-center">
              <h2 className="text-2xl font-bold text-[#004E92]">
                Registrations ({registrations.length})
              </h2>
              <button
                onClick={() => setShowRegistrations(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              {loadingRegistrations ? (
                <div className="text-center py-8">
                  <Loader2 className="animate-spin mx-auto mb-2" size={32} />
                  <span>Loading...</span>
                </div>
              ) : registrations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No registrations yet
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold">
                        Name
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold">
                        Email
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold">
                        Phone
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold">
                        Event Date
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold">
                        Registered
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {registrations.map((reg) => (
                      <tr key={reg.registration_id}>
                        <td className="px-4 py-3">{reg.name}</td>
                        <td className="px-4 py-3">{reg.email}</td>
                        <td className="px-4 py-3">{reg.phone}</td>
                        <td className="px-4 py-3 text-sm">
                          {reg.instance_date ? (
                            <span className="text-blue-600 font-medium">
                              {new Date(reg.instance_date).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {(() => {
                            const rawDate = new Date(reg.registered_at);
                            const correctedDate = new Date(rawDate.getTime() - (5.5 * 60 * 60 * 1000));
                            return correctedDate.toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            });
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
