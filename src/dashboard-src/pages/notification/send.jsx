import { useEffect, useMemo, useState } from "react";
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

const ButtonChoice = ({ active, children, ...props }) => (
  <button
    type="button"
    {...props}
    className={`px-3 py-2 rounded-lg border text-sm transition ${active ? "bg-blue-50 border-blue-500 text-blue-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
  >
    {children}
  </button>
);
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
        className="bg-white rounded-xl shadow p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3"
      >
        <div className="xl:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Candidate / phone
          </label>
          <div className="relative">
            <Search className="absolute w-4 h-4 text-gray-400 left-3 top-1/2 -translate-y-1/2" />
            <input
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              placeholder="Search name, username or phone"
              className="w-full pl-9 pr-3 py-2.5 border rounded-lg"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            From date
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters({ ...filters, startDate: e.target.value })
            }
            className="w-full px-3 py-2.5 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            To date
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters({ ...filters, endDate: e.target.value })
            }
            className="w-full px-3 py-2.5 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Notification type
          </label>
          <select
            value={filters.notificationType}
            onChange={(e) =>
              setFilters({ ...filters, notificationType: e.target.value })
            }
            className="w-full px-3 py-2.5 border rounded-lg"
          >
            <option value="">All types</option>
            <option value="broadcast">Broadcast</option>
            <option value="direct">Individual</option>
            <option value="morning_reminder">Morning reminder</option>
            <option value="evening_reminder">Evening reminder</option>
            <option value="daily_news">Daily news</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Open status
          </label>
          <select
            value={filters.openStatus}
            onChange={(e) =>
              setFilters({ ...filters, openStatus: e.target.value })
            }
            className="w-full px-3 py-2.5 border rounded-lg"
          >
            <option value="">All statuses</option>
            <option value="opened">Opened</option>
            <option value="unopened">Not opened</option>
          </select>
        </div>
        <div className="flex gap-2 items-end">
          <button className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Apply filters
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Clear
          </button>
        </div>
      </form>
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Metric label="Successful sends" value={summary.totalSent} />
          <Metric label="Opened" value={summary.totalOpened} />
          <Metric label="Not opened" value={summary.unopened} />
          <Metric label="Open rate" value={`${summary.openRate}%`} />
        </div>
      )}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-800">Delivery trail</h3>
          <p className="text-sm text-gray-500">
            Successful notification sends, newest first.
          </p>
        </div>
        {error && (
          <div className="m-5 p-3 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-5 py-3">Recipient</th>
                <th className="text-left px-5 py-3">Notification</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-left px-5 py-3">Sent</th>
                <th className="text-left px-5 py-3">Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-gray-500">
                    Loading trail…
                  </td>
                </tr>
              ) : data.length ? (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-800">
                        {item.recipient_name}
                      </div>
                      <div className="text-gray-500">
                        {item.phone || "No phone"}
                      </div>
                    </td>
                    <td className="px-5 py-3 max-w-xs">
                      <div className="font-medium text-gray-800 truncate">
                        {item.title || "Untitled notification"}
                      </div>
                      <div className="text-gray-500 line-clamp-2">
                        {item.body || "—"}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="capitalize px-2 py-1 rounded bg-blue-50 text-blue-700">
                        {item.notification_type.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {formatDateTime(item.sent_at)}
                    </td>
                    <td className="px-5 py-3">
                      {item.opened ? (
                        <>
                          <span className="text-green-700 font-medium">
                            Opened
                          </span>
                          <div className="text-gray-500 text-xs">
                            {formatDateTime(item.opened_at)}
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-500">Not opened</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-gray-500">
                    No notifications match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {pagination?.totalPages > 1 && (
          <div className="px-5 py-3 border-t flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Page {pagination.page} of {pagination.totalPages} ·{" "}
              {pagination.total} records
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const Metric = ({ label, value }) => (
  <div className="bg-white rounded-xl shadow p-4">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-2xl font-semibold text-gray-800 mt-1">{value}</div>
  </div>
);

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
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Bell className="w-8 h-8 text-blue-500" />
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Notifications</h2>
          <p className="text-gray-600">
            Send targeted push notifications and review engagement.
          </p>
        </div>
      </div>
      <div className="flex gap-1 mt-6 mb-6 border-b">
        <button
          onClick={() => setTab("compose")}
          className={`px-4 py-3 font-medium ${tab === "compose" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
        >
          Compose
        </button>
        <button
          onClick={() => setTab("trail")}
          className={`px-4 py-3 font-medium ${tab === "trail" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
        >
          Notification Trail
        </button>
      </div>
      {tab === "trail" ? (
        <NotificationTrail />
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <section className="bg-white rounded-xl shadow p-5">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Send to
            </label>
            <div className="flex gap-3">
              <ButtonChoice
                active={audienceMode === "broadcast"}
                onClick={() => setAudienceMode("broadcast")}
              >
                <Users className="inline w-4 h-4 mr-1" />
                Broadcast
              </ButtonChoice>
              <ButtonChoice
                active={audienceMode === "individual"}
                onClick={() => setAudienceMode("individual")}
              >
                <Send className="inline w-4 h-4 mr-1" />
                Individual
              </ButtonChoice>
            </div>
            {audienceMode === "individual" && (
              <div className="relative mt-4 max-w-xl">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Search recipient by name or phone
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={recipientSearch}
                    onFocus={() => setShowRecipients(true)}
                    onChange={(e) => {
                      setRecipientSearch(e.target.value);
                      setSelectedRecipient(null);
                      setShowRecipients(true);
                    }}
                    placeholder="Start typing a name or phone number"
                    className="w-full pl-9 pr-3 py-3 border rounded-lg"
                  />
                </div>
                {showRecipients && (
                  <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-auto">
                    {recipientLoading ? (
                      <div className="p-3 text-sm text-gray-500">
                        Searching…
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
                          className="w-full text-left px-4 py-3 border-b last:border-0 hover:bg-blue-50 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex justify-between gap-3">
                            <span className="font-medium text-gray-800">
                              {recipient.name}
                            </span>
                            {!recipient.hasActivePushToken && (
                              <span className="text-xs text-amber-700">
                                No active device
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {recipient.phone || "No phone number"}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-gray-500">
                        No users found.
                      </div>
                    )}
                  </div>
                )}
                {selectedRecipient && (
                  <p className="mt-2 text-sm text-green-700">
                    Selected: {selectedRecipient.name} (
                    {selectedRecipient.phone || "No phone"})
                  </p>
                )}
              </div>
            )}
          </section>
          <section className="bg-white rounded-xl shadow p-5 grid gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Notification title <span className="text-red-500">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-3 border rounded-lg"
                placeholder="Enter notification title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows="3"
                className="w-full px-4 py-3 border rounded-lg resize-none"
                placeholder="Enter notification message"
              />
            </div>
          </section>
          {audienceMode === "broadcast" && (
            <section className="bg-white rounded-xl shadow p-5 grid gap-5">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Users className="inline w-4 h-4 mr-1" />
                  Proficiency level
                </label>
                <div className="flex flex-wrap gap-2">
                  {["all", "a1", "a2", "b1"].map((level) => (
                    <ButtonChoice
                      key={level}
                      active={targetLevel === level}
                      onClick={() => setTargetLevel(level)}
                    >
                      {level === "all"
                        ? "All users"
                        : `${level.toUpperCase()} only`}
                    </ButtonChoice>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Learning mode
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["all", "All modes"],
                    ["learn", "Learn German"],
                    ["practice", "Practice"],
                    ["job_screening", "Job Screening"],
                  ].map(([value, label]) => (
                    <ButtonChoice
                      key={value}
                      active={targetMode === value}
                      onClick={() => setTargetMode(value)}
                    >
                      {label}
                    </ButtonChoice>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Smartphone className="inline w-4 h-4 mr-1" />
                  App version
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    ["all", "All versions"],
                    ["exact", "Exact version"],
                    ["range", "Version range"],
                  ].map(([value, label]) => (
                    <ButtonChoice
                      key={value}
                      active={versionFilterType === value}
                      onClick={() => setVersionFilterType(value)}
                    >
                      {label}
                    </ButtonChoice>
                  ))}
                </div>
                {versionFilterType === "exact" && (
                  <>
                    <input
                      list="notification-versions"
                      value={exactVersion}
                      onChange={(e) => setExactVersion(e.target.value)}
                      placeholder="Select or type a version, e.g. 1.1.8"
                      className="w-full max-w-sm px-3 py-2 border rounded-lg"
                    />
                    <datalist id="notification-versions">
                      {availableVersions.map((version) => (
                        <option key={version} value={version} />
                      ))}
                    </datalist>
                  </>
                )}
                {versionFilterType === "range" && (
                  <div className="flex gap-3 max-w-lg">
                    <input
                      value={minVersion}
                      onChange={(e) => setMinVersion(e.target.value)}
                      placeholder="Min version"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <input
                      value={maxVersion}
                      onChange={(e) => setMaxVersion(e.target.value)}
                      placeholder="Max version"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                )}
              </div>
            </section>
          )}
          <section className="bg-white rounded-xl shadow p-5">
            <label className="block text-sm font-medium mb-3">
              <Image className="inline w-4 h-4 mr-1" />
              Image (optional)
            </label>
            <div className="flex gap-2 mb-3">
              <ButtonChoice
                active={imageSource === "none"}
                onClick={() => {
                  setImageSource("none");
                  setImageUrl("");
                }}
              >
                No image
              </ButtonChoice>
              <ButtonChoice
                active={imageSource === "url"}
                onClick={() => setImageSource("url")}
              >
                Paste URL
              </ButtonChoice>
              <ButtonChoice
                active={imageSource === "upload"}
                onClick={() => setImageSource("upload")}
              >
                Upload
              </ButtonChoice>
            </div>
            {imageSource === "url" && (
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                type="url"
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border rounded-lg"
              />
            )}
            {imageSource === "upload" && (
              <label className="inline-flex gap-2 items-center px-3 py-2 bg-gray-100 rounded-lg cursor-pointer">
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading…" : "Choose image"}
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
              <div className="relative inline-block mt-3">
                <img
                  src={imageUrl}
                  alt="Notification preview"
                  className="h-24 rounded border"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </section>
          <section className="bg-white rounded-xl shadow p-5">
            <label className="block text-sm font-medium mb-3">
              <LinkIcon className="inline w-4 h-4 mr-1" />
              Link (optional)
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                ["none", "No link"],
                ["deep", "In-app page"],
                ["custom", "Custom path"],
                ["external", "External URL"],
              ].map(([value, label]) => (
                <ButtonChoice
                  key={value}
                  active={linkType === value}
                  onClick={() => setLinkType(value)}
                >
                  {value === "external" && (
                    <ExternalLink className="inline w-4 h-4 mr-1" />
                  )}
                  {label}
                </ButtonChoice>
              ))}
            </div>
            {linkType === "deep" && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDeepLinkDropdown(!showDeepLinkDropdown)}
                  className="w-full px-3 py-2 border rounded-lg text-left flex justify-between"
                >
                  <span>
                    {DEEP_LINK_ROUTES.find(
                      (route) => route.path === selectedDeepLink,
                    )?.label || "Select an in-app page"}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showDeepLinkDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow max-h-56 overflow-auto">
                    <input
                      value={deepLinkSearch}
                      onChange={(e) => setDeepLinkSearch(e.target.value)}
                      placeholder="Search pages"
                      className="m-2 w-[calc(100%-1rem)] px-3 py-2 border rounded"
                    />
                    {routes.map((route) => (
                      <button
                        type="button"
                        key={route.path}
                        onClick={() => {
                          setSelectedDeepLink(route.path);
                          setShowDeepLinkDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50"
                      >
                        <div>{route.label}</div>
                        <div className="text-xs text-gray-500">
                          {route.path}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {linkType === "custom" && (
              <input
                value={customDeepLink}
                onChange={(e) => setCustomDeepLink(e.target.value)}
                placeholder="/path/to/page"
                className="w-full px-3 py-2 border rounded-lg"
              />
            )}
            {linkType === "external" && (
              <input
                type="url"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border rounded-lg"
              />
            )}
          </section>
          <section className="bg-gray-50 rounded-xl p-4 border">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Preview
            </div>
            <div className="bg-white rounded-lg p-3 border flex gap-3">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt=""
                  className="w-14 h-14 object-cover rounded"
                />
              )}
              <div>
                <div className="font-semibold">
                  {title || "Notification title"}
                </div>
                <div className="text-sm text-gray-600">
                  {body || "Notification message"}
                </div>
                {getLink() && (
                  <div className="text-xs text-blue-600 mt-1">{getLink()}</div>
                )}
              </div>
            </div>
          </section>
          {status.message && (
            <div
              className={`p-4 rounded-lg flex gap-2 ${status.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
            >
              {status.type === "success" ? (
                <CheckCircle className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span>{status.message}</span>
            </div>
          )}
          <button
            disabled={
              loading ||
              uploading ||
              (audienceMode === "individual" && !selectedRecipient)
            }
            className="w-full flex justify-center items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            {loading ? "Sending…" : `Send to ${audienceLabel}`}
          </button>
        </form>
      )}
    </div>
  );
}
