import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle,
  ChevronDown,
  ExternalLink,
  Image,
  Link as LinkIcon,
  Search,
  Send,
  Smartphone,
  Upload,
  Users,
  X,
} from "lucide-react";
import api from "../../../api/axios";

// Reusable components from Payments Admin design system
import {
  EmptyState,
  StatCard,
  TableSkeleton,
} from "../../payments-admin/components/common";
import {
  CONTROL_BASE,
  ControlInput,
  ControlSelect,
  ControlButton,
  ActionChip,
  ControlDropdown,
} from "../../payments-admin/components/controls";
import { PaginationBar } from "../../payments-admin/components/PaginationBar";

const DEEP_LINK_ROUTES = [
  { path: "/", label: "Home", category: "General" },
  { path: "/continue", label: "Continue Practice", category: "General" },
  { path: "/stories", label: "All Stories", category: "Stories" },
  { path: "/events", label: "All Events", category: "Events" },
  { path: "/events/featured", label: "Featured Events", category: "Events" },
  { path: "/a1", label: "A1 Flashcards", category: "A1 Level" },
  { path: "/pronounce/A1", label: "A1 Pronunciation", category: "A1 Level" },
  { path: "/conversation/A1", label: "A1 Conversations", category: "A1 Level" },
  { path: "/test/A1", label: "A1 Tests", category: "A1 Level" },
  { path: "/a2/flashcard", label: "A2 Flashcards", category: "A2 Level" },
  { path: "/a2/speaking", label: "A2 Speaking", category: "A2 Level" },
  { path: "/a2/grammar", label: "A2 Grammar", category: "A2 Level" },
  { path: "/a2/listening", label: "A2 Listening", category: "A2 Level" },
  { path: "/a2/reading", label: "A2 Reading", category: "A2 Level" },
  { path: "/a2/test", label: "A2 Tests", category: "A2 Level" },
];

const NOTIFICATION_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "broadcast", label: "Broadcast" },
  { value: "direct", label: "Individual" },
  { value: "morning_reminder", label: "Morning reminder" },
  { value: "evening_reminder", label: "Evening reminder" },
  { value: "daily_news", label: "Daily news" },
];

const OPEN_STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "opened", label: "Opened" },
  { value: "unopened", label: "Not opened" },
];

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

function NotificationTrail() {
  const [filters, setFilters] = useState({
    search: "",
    startDate: "",
    endDate: "",
    notificationType: "",
    openStatus: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadTrail = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      Object.entries(appliedFilters).forEach(
        ([key, value]) => value && params.set(key, value),
      );
      const response = await api.get(`/notifications/trail?${params}`);
      setData(response.data.data || []);
      setSummary(response.data.summary);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(
        err.response?.data?.error || "Unable to load notification trail",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrail();
  }, [page, appliedFilters]);

  const applyFilters = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    const next = {
      search: "",
      startDate: "",
      endDate: "",
      notificationType: "",
      openStatus: "",
    };
    setFilters(next);
    setPage(1);
    setAppliedFilters(next);
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={applyFilters}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="xl:col-span-2 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500">
              Candidate / Phone
            </label>
            <ControlInput
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              placeholder="Search name, username or phone"
              leftIcon={<Search size={14} />}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500">
              From Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className={`${CONTROL_BASE} w-full`}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500">
              To Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className={`${CONTROL_BASE} w-full`}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500">
              Notification Type
            </label>
            <ControlDropdown
              value={filters.notificationType}
              onChange={(val) => setFilters({ ...filters, notificationType: val })}
              options={NOTIFICATION_TYPE_OPTIONS}
              placeholder="All types"
              className="w-full"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Open Status:</span>
            <ControlDropdown
              value={filters.openStatus}
              onChange={(val) => setFilters({ ...filters, openStatus: val })}
              options={OPEN_STATUS_OPTIONS}
              placeholder="All statuses"
              compact={true}
              className="w-40"
            />
          </div>
          <div className="flex gap-2">
            <ControlButton type="button" onClick={clearFilters} variant="secondary">
              Clear Filters
            </ControlButton>
            <ControlButton type="submit" variant="primary">
              Apply Filters
            </ControlButton>
          </div>
        </div>
      </form>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Successful Sends"
            value={summary.totalSent}
            tone="emerald"
            infoText="Total push notifications successfully sent to user devices."
          />
          <StatCard
            label="Opened"
            value={summary.totalOpened}
            tone="blue"
            infoText="Total push notifications clicked or opened by recipients."
          />
          <StatCard
            label="Not Opened"
            value={summary.unopened}
            tone="slate"
            infoText="Total push notifications delivered but not yet clicked or opened."
          />
          <StatCard
            label="Open Rate"
            value={`${summary.openRate}%`}
            tone="purple"
            infoText="Percentage of sent notifications that were opened by recipients."
          />
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900">Delivery Trail</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time push delivery history, newest logs first
            </p>
          </div>
          {pagination && (
            <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
              {pagination.total} records found
            </span>
          )}
        </div>

        {error && (
          <div className="m-5 p-4 rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-5">
            <TableSkeleton rows={8} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="text-left px-5 py-3.5">Recipient</th>
                  <th className="text-left px-5 py-3.5">Notification</th>
                  <th className="text-left px-5 py-3.5">Type</th>
                  <th className="text-left px-5 py-3.5">Sent</th>
                  <th className="text-left px-5 py-3.5">Engagement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.length ? (
                  data.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">
                          {item.recipient_name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {item.phone || "No phone"}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <div className="font-semibold text-slate-800 truncate">
                          {item.title || "Untitled notification"}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {item.body || "—"}
                        </div>
                        {item.deep_link_data && (
                          <div className="text-[10px] font-bold text-slate-500 mt-1.5 inline-flex items-center gap-1 bg-slate-100 rounded px-1.5 py-0.5 border border-slate-200">
                            <LinkIcon size={10} />
                            <span>{item.deep_link_data}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {item.notification_type === "broadcast" ? (
                          <span className="capitalize text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                            Broadcast
                          </span>
                        ) : item.notification_type === "direct" ? (
                          <span className="capitalize text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                            Individual
                          </span>
                        ) : (
                          <span className="capitalize text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {item.notification_type.replaceAll("_", " ")}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 font-medium">
                        {formatDateTime(item.sent_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        {item.opened ? (
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-emerald-600 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Opened
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                              {formatDateTime(item.opened_at)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            Not opened
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-6">
                      <EmptyState message="No notification records match these filters." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {pagination?.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-200 flex justify-end">
            <PaginationBar
              currentPage={page}
              totalPages={pagination.totalPages}
              setCurrentPage={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function SendNotification() {
  const [tab, setTab] = useState("compose");
  const [audienceMode, setAudienceMode] = useState("broadcast");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [linkType, setLinkType] = useState("none");
  const [selectedDeepLink, setSelectedDeepLink] = useState("");
  const [customDeepLink, setCustomDeepLink] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [deepLinkSearch, setDeepLinkSearch] = useState("");
  const [showDeepLinkDropdown, setShowDeepLinkDropdown] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageSource, setImageSource] = useState("none");
  const [targetLevel, setTargetLevel] = useState("all");
  const [targetMode, setTargetMode] = useState("all");
  const [availableVersions, setAvailableVersions] = useState([]);
  const [versionFilterType, setVersionFilterType] = useState("all");
  const [exactVersion, setExactVersion] = useState("");
  const [minVersion, setMinVersion] = useState("");
  const [maxVersion, setMaxVersion] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [showRecipients, setShowRecipients] = useState(false);

  const recipientWrapRef = useRef(null);
  const deepLinkWrapRef = useRef(null);

  // Click outside hooks to close search results and select dropdown overlays
  useEffect(() => {
    function handleOutsideRecipient(event) {
      if (recipientWrapRef.current && !recipientWrapRef.current.contains(event.target)) {
        setShowRecipients(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideRecipient);
    return () => document.removeEventListener("mousedown", handleOutsideRecipient);
  }, []);

  useEffect(() => {
    function handleOutsideDeepLink(event) {
      if (deepLinkWrapRef.current && !deepLinkWrapRef.current.contains(event.target)) {
        setShowDeepLinkDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideDeepLink);
    return () => document.removeEventListener("mousedown", handleOutsideDeepLink);
  }, []);

  useEffect(() => {
    api
      .get("/notifications/versions")
      .then((res) => setAvailableVersions(res.data.versions || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (audienceMode !== "individual") return;
    const query = recipientSearch.trim();
    const timeout = setTimeout(async () => {
      setRecipientLoading(true);
      try {
        const response = await api.get(
          `/notifications/recipients?query=${encodeURIComponent(query)}&limit=20`,
        );
        setRecipients(response.data.recipients || []);
      } catch {
        setRecipients([]);
      } finally {
        setRecipientLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [recipientSearch, audienceMode]);

  const routes = useMemo(
    () =>
      DEEP_LINK_ROUTES.filter((route) =>
        `${route.label} ${route.path} ${route.category}`
          .toLowerCase()
          .includes(deepLinkSearch.toLowerCase()),
      ),
    [deepLinkSearch],
  );

  const buildVersionFilter = () =>
    versionFilterType === "exact" && exactVersion
      ? { type: "exact", exact: exactVersion }
      : versionFilterType === "range" && (minVersion || maxVersion)
        ? {
            type: "range",
            minVersion: minVersion || undefined,
            maxVersion: maxVersion || undefined,
          }
        : { type: "all" };

  const getLink = () =>
    linkType === "deep"
      ? selectedDeepLink
      : linkType === "custom"
        ? customDeepLink
        : linkType === "external"
          ? externalLink
          : "";

  const resetForm = () => {
    setTitle("");
    setBody("");
    setLinkType("none");
    setSelectedDeepLink("");
    setCustomDeepLink("");
    setExternalLink("");
    setImageUrl("");
    setImageSource("none");
    setTargetLevel("all");
    setTargetMode("all");
    setVersionFilterType("all");
    setExactVersion("");
    setMinVersion("");
    setMaxVersion("");
    setRecipientSearch("");
    setSelectedRecipient(null);
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setStatus({
        type: "error",
        message: "Use an image file smaller than 5MB",
      });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await api.post(
        "/admin/upload/notification-image",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setImageUrl(response.data.url);
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.error || "Image upload failed",
      });
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!title || !body)
      return setStatus({
        type: "error",
        message: "Title and message are required",
      });
    if (audienceMode === "individual" && !selectedRecipient)
      return setStatus({
        type: "error",
        message: "Choose a recipient with an active push token",
      });
    if (versionFilterType === "exact" && !exactVersion)
      return setStatus({
        type: "error",
        message: "Choose an exact app version or switch to all versions",
      });
    if (versionFilterType === "range" && !minVersion && !maxVersion)
      return setStatus({
        type: "error",
        message: "Choose at least one version range boundary",
      });
    setLoading(true);
    setStatus({ type: "", message: "" });
    const payload = { title, body };
    if (linkType === "external" && externalLink)
      payload.externalLink = externalLink;
    else if (getLink()) payload.deepLink = getLink();
    if (imageUrl && imageSource !== "none") payload.imageUrl = imageUrl;
    if (audienceMode === "broadcast") {
      if (targetLevel !== "all") payload.targetLevel = targetLevel;
      if (targetMode !== "all") payload.targetMode = targetMode;
      payload.versionFilter = buildVersionFilter();
    } else payload.userId = selectedRecipient.userId;
    try {
      const response = await api.post(
        audienceMode === "individual"
          ? "/notifications/send"
          : "/notifications/broadcast",
        payload,
      );
      setStatus({
        type: "success",
        message:
          audienceMode === "individual"
            ? `Notification sent to ${selectedRecipient.name}.`
            : `Sent to ${response.data.sentTo} of ${response.data.targeted} targeted users${response.data.failedCount ? ` (${response.data.failedCount} failed)` : ""}.`,
      });
      resetForm();
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.error || "Notification could not be sent",
      });
    } finally {
      setLoading(false);
    }
  };

  const audienceLabel =
    audienceMode === "individual"
      ? selectedRecipient?.name || "recipient"
      : targetLevel === "all"
        ? "all users"
        : `${targetLevel.toUpperCase()} users`;

  return (
    <div className="space-y-5">
      {/* Header Info Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2.5 text-white">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Skillcase Notifications Admin
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Send targeted push notifications and review delivery engagement analytics
              </p>
            </div>
          </div>
        </div>
        {/* Navigation Tabs */}
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionChip
            onClick={() => setTab("compose")}
            active={tab === "compose"}
            className="h-10 rounded-full px-4 text-sm"
          >
            Compose Notification
          </ActionChip>
          <ActionChip
            onClick={() => setTab("trail")}
            active={tab === "trail"}
            className="h-10 rounded-full px-4 text-sm"
          >
            Delivery Trail
          </ActionChip>
        </div>
      </div>

      {tab === "trail" ? (
        <NotificationTrail />
      ) : (
        <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Settings */}
          <div className="lg:col-span-7 space-y-5">
            {/* Audience Targeting Card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Target Audience</h3>
              <div className="flex gap-2">
                <ActionChip
                  active={audienceMode === "broadcast"}
                  onClick={() => setAudienceMode("broadcast")}
                  className="h-9 px-3.5"
                >
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  Broadcast Group
                </ActionChip>
                <ActionChip
                  active={audienceMode === "individual"}
                  onClick={() => setAudienceMode("individual")}
                  className="h-9 px-3.5"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Direct Individual
                </ActionChip>
              </div>

              {audienceMode === "individual" && (
                <div ref={recipientWrapRef} className="relative max-w-xl pt-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Search recipient by name or phone
                  </label>
                  <div className="relative">
                    <ControlInput
                      value={recipientSearch}
                      onFocus={() => setShowRecipients(true)}
                      onChange={(e) => {
                        setRecipientSearch(e.target.value);
                        setSelectedRecipient(null);
                        setShowRecipients(true);
                      }}
                      placeholder="Start typing a name or phone number"
                      leftIcon={<Search size={14} />}
                      className="w-full"
                    />
                  </div>
                  {showRecipients && (
                    <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-auto p-1.5 space-y-0.5">
                      {recipientLoading ? (
                        <div className="p-3 text-sm text-slate-500 text-center flex items-center justify-center gap-2">
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                          <span>Searching...</span>
                        </div>
                      ) : recipients.length ? (
                        recipients.map((recipient) => (
                          <button
                            type="button"
                            disabled={!recipient.hasActivePushToken}
                            key={recipient.userId}
                            onClick={() => {
                              setSelectedRecipient(recipient);
                              setRecipientSearch(
                                `${recipient.name} · ${recipient.phone || "No phone"}`,
                              );
                              setShowRecipients(false);
                            }}
                            className="w-full text-left rounded-lg px-3 py-2 hover:bg-slate-50 disabled:bg-slate-50 disabled:opacity-50 transition"
                          >
                            <div className="flex justify-between items-center gap-3">
                              <span className="font-semibold text-slate-800">
                                {recipient.name}
                              </span>
                              {!recipient.hasActivePushToken && (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                  No active device
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {recipient.phone || "No phone number"}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-sm text-slate-400 text-center">
                          No users found.
                        </div>
                      )}
                    </div>
                  )}
                  {selectedRecipient && (
                    <p className="mt-2 text-xs font-semibold text-emerald-600">
                      Selected: {selectedRecipient.name} ({selectedRecipient.phone || "No phone"})
                    </p>
                  )}
                </div>
              )}

              {audienceMode === "broadcast" && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500">
                      Proficiency Level
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["all", "a1", "a2", "b1"].map((level) => (
                        <ActionChip
                          key={level}
                          active={targetLevel === level}
                          onClick={() => setTargetLevel(level)}
                          className="h-9 px-3"
                        >
                          {level === "all" ? "All Levels" : `${level.toUpperCase()} only`}
                        </ActionChip>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500">
                      Learning Mode
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ["all", "All modes"],
                        ["learn", "Learn German"],
                        ["practice", "Practice"],
                        ["job_screening", "Job Screening"],
                      ].map(([value, label]) => (
                        <ActionChip
                          key={value}
                          active={targetMode === value}
                          onClick={() => setTargetMode(value)}
                          className="h-9 px-3"
                        >
                          {label}
                        </ActionChip>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500">
                      Target App Version
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {[
                        ["all", "All versions"],
                        ["exact", "Exact version"],
                        ["range", "Version range"],
                      ].map(([value, label]) => (
                        <ActionChip
                          key={value}
                          active={versionFilterType === value}
                          onClick={() => setVersionFilterType(value)}
                          className="h-9 px-3"
                        >
                          {label}
                        </ActionChip>
                      ))}
                    </div>
                    {versionFilterType === "exact" && (
                      <div className="relative">
                        <ControlInput
                          list="notification-versions"
                          value={exactVersion}
                          onChange={(e) => setExactVersion(e.target.value)}
                          placeholder="Select or type a version, e.g. 1.1.8"
                          className="w-full max-w-sm"
                        />
                        <datalist id="notification-versions">
                          {availableVersions.map((version) => (
                            <option key={version} value={version} />
                          ))}
                        </datalist>
                      </div>
                    )}
                    {versionFilterType === "range" && (
                      <div className="flex gap-3 max-w-md">
                        <ControlInput
                          value={minVersion}
                          onChange={(e) => setMinVersion(e.target.value)}
                          placeholder="Min version"
                          className="w-full"
                        />
                        <ControlInput
                          value={maxVersion}
                          onChange={(e) => setMaxVersion(e.target.value)}
                          placeholder="Max version"
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Notification Content Card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Notification Message</h3>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500">
                  Notification Title <span className="text-rose-500">*</span>
                </label>
                <ControlInput
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full"
                  placeholder="Enter notification title"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500">
                  Message Body <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows="3"
                  className={`${CONTROL_BASE} w-full py-2.5 h-auto resize-none`}
                  placeholder="Enter notification message"
                />
              </div>
            </section>

            {/* Optional Attachments Card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Optional Attachments</h3>
              
              {/* Image Section */}
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <label className="block text-xs font-semibold text-slate-500">
                  <Image className="inline w-3.5 h-3.5 mr-1.5" />
                  Banner Image
                </label>
                <div className="flex gap-2 mb-2">
                  <ActionChip
                    active={imageSource === "none"}
                    onClick={() => {
                      setImageSource("none");
                      setImageUrl("");
                    }}
                    className="h-9"
                  >
                    No image
                  </ActionChip>
                  <ActionChip
                    active={imageSource === "url"}
                    onClick={() => setImageSource("url")}
                    className="h-9"
                  >
                    Paste URL
                  </ActionChip>
                  <ActionChip
                    active={imageSource === "upload"}
                    onClick={() => setImageSource("upload")}
                    className="h-9"
                  >
                    Upload File
                  </ActionChip>
                </div>
                {imageSource === "url" && (
                  <ControlInput
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    className="w-full"
                  />
                )}
                {imageSource === "upload" && (
                  <label className="inline-flex gap-2 items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition text-sm font-semibold border border-slate-200">
                    <Upload className="w-4 h-4" />
                    {uploading ? "Uploading..." : "Choose image file"}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={uploadImage}
                      className="hidden"
                    />
                  </label>
                )}
                {imageUrl && (
                  <div className="relative inline-block mt-3 bg-slate-50 rounded-xl p-1.5 border border-slate-200">
                    <img
                      src={imageUrl}
                      alt="Notification banner"
                      className="h-24 rounded-lg border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 shadow"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Link Section */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500">
                  <LinkIcon className="inline w-3.5 h-3.5 mr-1.5" />
                  Navigation Link
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[
                    ["none", "No link"],
                    ["deep", "In-app page"],
                    ["custom", "Custom path"],
                    ["external", "External URL"],
                  ].map(([value, label]) => (
                    <ActionChip
                      key={value}
                      active={linkType === value}
                      onClick={() => setLinkType(value)}
                      className="h-9"
                    >
                      {value === "external" && (
                        <ExternalLink className="inline w-3.5 h-3.5 mr-1.5" />
                      )}
                      {label}
                    </ActionChip>
                  ))}
                </div>

                {linkType === "deep" && (
                  <div ref={deepLinkWrapRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDeepLinkDropdown(!showDeepLinkDropdown)}
                      className={`${CONTROL_BASE} flex w-full items-center justify-between border border-slate-300 bg-white outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100`}
                    >
                      <span className="truncate text-left">
                        {DEEP_LINK_ROUTES.find((r) => r.path === selectedDeepLink)?.label || "Select an in-app page"}
                      </span>
                      <ChevronDown size={16} className="ml-2 shrink-0 text-slate-500" />
                    </button>
                    {showDeepLinkDropdown && (
                      <div className="absolute z-10 w-full mt-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg max-h-72 overflow-hidden flex flex-col">
                        <div className="p-1">
                          <ControlInput
                            value={deepLinkSearch}
                            onChange={(e) => setDeepLinkSearch(e.target.value)}
                            placeholder="Search pages..."
                            leftIcon={<Search size={14} />}
                            className="w-full h-9"
                          />
                        </div>
                        <div className="max-h-52 overflow-y-auto mt-1 space-y-0.5">
                          {routes.map((route) => (
                            <button
                              type="button"
                              key={route.path}
                              onClick={() => {
                                setSelectedDeepLink(route.path);
                                setShowDeepLinkDropdown(false);
                              }}
                              className={`w-full text-left rounded-lg px-2.5 py-2 text-sm transition ${
                                selectedDeepLink === route.path
                                  ? "bg-slate-100 text-slate-900 font-semibold"
                                  : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <div className="font-semibold text-slate-800">{route.label}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{route.path}</div>
                            </button>
                          ))}
                          {routes.length === 0 && (
                            <p className="px-2 py-2 text-xs text-slate-500 text-center">No pages found</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {linkType === "custom" && (
                  <ControlInput
                    value={customDeepLink}
                    onChange={(e) => setCustomDeepLink(e.target.value)}
                    placeholder="/path/to/page"
                    className="w-full"
                  />
                )}
                
                {linkType === "external" && (
                  <ControlInput
                    type="url"
                    value={externalLink}
                    onChange={(e) => setExternalLink(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full"
                  />
                )}
              </div>
            </section>

            {status.message && (
              <div
                className={`p-4 rounded-2xl border flex gap-3 ${status.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}
              >
                {status.type === "success" ? (
                  <CheckCircle className="w-5 h-5 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0" />
                )}
                <span className="text-sm font-semibold">{status.message}</span>
              </div>
            )}

            <ControlButton
              disabled={
                loading ||
                uploading ||
                (audienceMode === "individual" && !selectedRecipient)
              }
              variant="primary"
              className="w-full h-12 text-base rounded-2xl shadow"
            >
              <Send className="w-4 h-4 mr-2" />
              {loading ? "Sending notifications..." : `Send Notification to ${audienceLabel}`}
            </ControlButton>
          </div>

          {/* Right Column: Live Mockup Preview */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 shadow-xl text-white select-none relative overflow-hidden flex flex-col items-center min-h-[460px]">
              {/* Lock screen background gradient */}
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 opacity-90 z-0" />
              
              {/* Notch */}
              <div className="relative w-32 h-4.5 bg-slate-950 rounded-b-2xl border-x border-b border-white/5 mb-8 z-10" />

              {/* Time display */}
              <div className="relative text-center mb-8 z-10">
                <div className="text-4xl font-extralight tracking-tight">15:08</div>
                <div className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wider">Saturday, July 11</div>
              </div>

              {/* Push Bubble */}
              <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-4 shadow-lg transition-all z-10">
                <div className="flex items-start gap-3">
                  {/* App Icon */}
                  <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 shadow-inner">
                    <Bell className="w-4 h-4 text-white" />
                  </div>
                  
                  {/* Contents */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-white tracking-wider uppercase">SKILLCASE</span>
                      <span className="text-[9px] text-white/60 font-semibold uppercase">now</span>
                    </div>
                    <div className="text-xs font-bold text-white mt-1 truncate">
                      {title || "Notification Title"}
                    </div>
                    <div className="text-[11px] text-white/80 mt-0.5 line-clamp-3 leading-relaxed break-words">
                      {body || "Notification message content goes here. Start typing in the form to see a live preview of how this message will display to students on their devices."}
                    </div>
                    
                    {/* Embedded Link preview */}
                    {getLink() && (
                      <div className="mt-2 inline-flex items-center gap-1.5 text-[9px] font-bold bg-white/15 hover:bg-white/20 text-white rounded-full px-2.5 py-0.5 border border-white/5 truncate max-w-full">
                        <LinkIcon className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{getLink()}</span>
                      </div>
                    )}
                  </div>

                  {/* Attachment image preview */}
                  {imageUrl && imageSource !== "none" && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 shadow bg-slate-800">
                      <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* Simulator info */}
              <div className="relative text-[9px] text-slate-500 mt-14 font-bold tracking-widest uppercase z-10">
                Push Notification Preview
              </div>
              <div className="relative w-32 h-1 bg-white/25 rounded-full mt-4 z-10" />
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
