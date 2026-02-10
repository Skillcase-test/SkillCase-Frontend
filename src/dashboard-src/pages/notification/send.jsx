import { useState, useMemo } from "react";
import {
  Send,
  CheckCircle,
  AlertCircle,
  Bell,
  Link as LinkIcon,
  ExternalLink,
  Image,
  Upload,
  X,
  Search,
  ChevronDown,
  Users,
} from "lucide-react";
import api from "../../../api/axios";

// All available in-app routes for deep linking
const DEEP_LINK_ROUTES = [
  { path: "/", label: "Home", category: "General" },
  { path: "/continue", label: "Continue Practice", category: "General" },
  { path: "/stories", label: "All Stories", category: "Stories" },
  { path: "/events", label: "All Events", category: "Events" },
  { path: "/events/featured", label: "Featured Events", category: "Events" },

  // A1 Routes
  {
    path: "/practice/A1",
    label: "A1 Flashcard Chapters",
    category: "A1 Level",
  },
  {
    path: "/pronounce/A1",
    label: "A1 Pronunciation Chapters",
    category: "A1 Level",
  },
  {
    path: "/conversation/A1",
    label: "A1 Conversations",
    category: "A1 Level",
  },
  { path: "/test/A1", label: "A1 Tests", category: "A1 Level" },

  // A2 Routes
  {
    path: "/a2/flashcard",
    label: "A2 Flashcard Chapters",
    category: "A2 Level",
  },
  {
    path: "/a2/speaking",
    label: "A2 Speaking Chapters",
    category: "A2 Level",
  },
  {
    path: "/a2/grammar",
    label: "A2 Grammar Topics",
    category: "A2 Level",
  },
  {
    path: "/a2/listening",
    label: "A2 Listening Chapters",
    category: "A2 Level",
  },
  {
    path: "/a2/reading",
    label: "A2 Reading Chapters",
    category: "A2 Level",
  },
  { path: "/a2/test", label: "A2 Tests", category: "A2 Level" },
];

export default function SendNotification() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  // Deep Link state
  const [linkType, setLinkType] = useState("none"); // none, deep, external, custom
  const [selectedDeepLink, setSelectedDeepLink] = useState("");
  const [customDeepLink, setCustomDeepLink] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [deepLinkSearch, setDeepLinkSearch] = useState("");
  const [showDeepLinkDropdown, setShowDeepLinkDropdown] = useState(false);

  // Image state
  const [imageUrl, setImageUrl] = useState("");
  const [imageSource, setImageSource] = useState("none"); // none, url, upload

  // Target level state
  const [targetLevel, setTargetLevel] = useState("all"); // all, a1, a2

  // Filter deep links based on search
  const filteredRoutes = useMemo(() => {
    if (!deepLinkSearch) return DEEP_LINK_ROUTES;
    const search = deepLinkSearch.toLowerCase();
    return DEEP_LINK_ROUTES.filter(
      (route) =>
        route.label.toLowerCase().includes(search) ||
        route.path.toLowerCase().includes(search) ||
        route.category.toLowerCase().includes(search),
    );
  }, [deepLinkSearch]);

  // Group routes by category
  const groupedRoutes = useMemo(() => {
    return filteredRoutes.reduce((acc, route) => {
      if (!acc[route.category]) acc[route.category] = [];
      acc[route.category].push(route);
      return acc;
    }, {});
  }, [filteredRoutes]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setStatus({ type: "error", message: "Please select an image file" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setStatus({ type: "error", message: "Image must be less than 5MB" });
      return;
    }

    setUploading(true);
    setStatus({ type: "", message: "" });

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await api.post("/admin/upload/notification-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setImageUrl(res.data.url);
      setStatus({ type: "success", message: "Image uploaded successfully!" });
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.error || "Failed to upload image",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !body) {
      setStatus({ type: "error", message: "Title and message are required" });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    // Build payload
    const payload = { title, body };

    // Add deep link based on selection
    if (linkType === "deep" && selectedDeepLink) {
      payload.deepLink = selectedDeepLink;
    } else if (linkType === "custom" && customDeepLink) {
      payload.deepLink = customDeepLink;
    } else if (linkType === "external" && externalLink) {
      payload.externalLink = externalLink;
    }

    // Add image if provided
    if (imageSource !== "none" && imageUrl) {
      payload.imageUrl = imageUrl;
    }

    // Add target level
    if (targetLevel !== "all") {
      payload.targetLevel = targetLevel;
    }

    try {
      const res = await api.post("/notifications/broadcast", payload);
      setStatus({
        type: "success",
        message: `Notification sent to ${res.data.sentTo} users!${
          res.data.failedCount > 0 ? ` (${res.data.failedCount} failed)` : ""
        }`,
      });

      // Reset form
      setTitle("");
      setBody("");
      setLinkType("none");
      setSelectedDeepLink("");
      setCustomDeepLink("");
      setExternalLink("");
      setImageUrl("");
      setImageSource("none");
      setTargetLevel("all");
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.error || "Failed to send notification",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLinkPreview = () => {
    if (linkType === "deep" && selectedDeepLink) {
      const route = DEEP_LINK_ROUTES.find((r) => r.path === selectedDeepLink);
      return route ? `${route.label} (${route.path})` : selectedDeepLink;
    }
    if (linkType === "custom" && customDeepLink) return customDeepLink;
    if (linkType === "external" && externalLink) return externalLink;
    return "No link";
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-8 h-8 text-blue-500" />
        <h2 className="text-2xl font-bold text-gray-800">
          Broadcast Notification
        </h2>
      </div>

      <p className="text-gray-600 mb-6">
        Send a push notification to all users. Add optional images and links.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notification Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter notification title"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Message */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notification Message <span className="text-red-500">*</span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Enter notification message"
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            required
          />
        </div>

        {/* Target Audience */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Users className="w-4 h-4 inline mr-2" />
            Target Audience
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setTargetLevel("all")}
              className={`px-4 py-2 rounded-lg border transition ${
                targetLevel === "all"
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              All Users
            </button>
            <button
              type="button"
              onClick={() => setTargetLevel("a1")}
              className={`px-4 py-2 rounded-lg border transition ${
                targetLevel === "a1"
                  ? "bg-green-50 border-green-500 text-green-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              A1 Only
            </button>
            <button
              type="button"
              onClick={() => setTargetLevel("a2")}
              className={`px-4 py-2 rounded-lg border transition ${
                targetLevel === "a2"
                  ? "bg-purple-50 border-purple-500 text-purple-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              A2 Only
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Send notification to specific proficiency level users
          </p>
        </div>

        {/* Image Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Image className="w-4 h-4 inline mr-2" />
            Notification Image (Optional)
          </label>

          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={() => {
                setImageSource("none");
                setImageUrl("");
              }}
              className={`px-4 py-2 rounded-lg border transition ${
                imageSource === "none"
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              No Image
            </button>
            <button
              type="button"
              onClick={() => setImageSource("url")}
              className={`px-4 py-2 rounded-lg border transition ${
                imageSource === "url"
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Paste URL
            </button>
            <button
              type="button"
              onClick={() => setImageSource("upload")}
              className={`px-4 py-2 rounded-lg border transition ${
                imageSource === "upload"
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Upload File
            </button>
          </div>

          {imageSource === "url" && (
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          )}

          {imageSource === "upload" && (
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-3 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition">
                <Upload className="w-5 h-5" />
                {uploading ? "Uploading..." : "Choose File"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              {imageUrl && (
                <span className="text-green-600 text-sm flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Uploaded
                </span>
              )}
            </div>
          )}

          {imageUrl && (
            <div className="mt-4 relative inline-block">
              <img
                src={imageUrl}
                alt="Preview"
                className="max-h-32 rounded-lg border"
              />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Link Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <LinkIcon className="w-4 h-4 inline mr-2" />
            Notification Link (Optional)
          </label>

          <div className="flex flex-wrap gap-3 mb-4">
            <button
              type="button"
              onClick={() => setLinkType("none")}
              className={`px-4 py-2 rounded-lg border transition ${
                linkType === "none"
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              No Link
            </button>
            <button
              type="button"
              onClick={() => setLinkType("deep")}
              className={`px-4 py-2 rounded-lg border transition flex items-center gap-2 ${
                linkType === "deep"
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <LinkIcon className="w-4 h-4" /> In-App Page
            </button>
            <button
              type="button"
              onClick={() => setLinkType("custom")}
              className={`px-4 py-2 rounded-lg border transition ${
                linkType === "custom"
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Custom Path
            </button>
            <button
              type="button"
              onClick={() => setLinkType("external")}
              className={`px-4 py-2 rounded-lg border transition flex items-center gap-2 ${
                linkType === "external"
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <ExternalLink className="w-4 h-4" /> External URL
            </button>
          </div>

          {/* In-App Deep Link Dropdown */}
          {linkType === "deep" && (
            <div className="relative">
              <div
                className="w-full px-4 py-3 border border-gray-300 rounded-lg cursor-pointer flex items-center justify-between"
                onClick={() => setShowDeepLinkDropdown(!showDeepLinkDropdown)}
              >
                <span
                  className={
                    selectedDeepLink ? "text-gray-900" : "text-gray-400"
                  }
                >
                  {selectedDeepLink
                    ? DEEP_LINK_ROUTES.find((r) => r.path === selectedDeepLink)
                        ?.label
                    : "Select a page..."}
                </span>
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </div>

              {showDeepLinkDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
                  <div className="p-2 border-b sticky top-0 bg-white">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search pages..."
                        value={deepLinkSearch}
                        onChange={(e) => setDeepLinkSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-48">
                    {Object.entries(groupedRoutes).map(([category, routes]) => (
                      <div key={category}>
                        <div className="px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-50">
                          {category}
                        </div>
                        {routes.map((route) => (
                          <div
                            key={route.path}
                            onClick={() => {
                              setSelectedDeepLink(route.path);
                              setShowDeepLinkDropdown(false);
                              setDeepLinkSearch("");
                            }}
                            className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                              selectedDeepLink === route.path
                                ? "bg-blue-100"
                                : ""
                            }`}
                          >
                            <div className="font-medium text-sm">
                              {route.label}
                            </div>
                            <div className="text-xs text-gray-500">
                              {route.path}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Deep Link Input */}
          {linkType === "custom" && (
            <div>
              <input
                type="text"
                value={customDeepLink}
                onChange={(e) => setCustomDeepLink(e.target.value)}
                placeholder="/practice/A1/chapter-5"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter any in-app path including parameters (e.g.,
                /story/my-story-slug)
              </p>
            </div>
          )}

          {/* External Link Input */}
          {linkType === "external" && (
            <div>
              <input
                type="url"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will open in the device browser
              </p>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-medium text-gray-700 mb-2">Preview</h3>
          <div className="bg-white rounded-lg p-3 shadow-sm border flex gap-3">
            {imageUrl && (
              <img
                src={imageUrl}
                alt=""
                className="w-16 h-16 rounded object-cover"
              />
            )}
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {title || "Notification Title"}
              </p>
              <p className="text-gray-600 text-sm">
                {body || "Notification message..."}
              </p>
              <p className="text-xs text-blue-600 mt-1">{getLinkPreview()}</p>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {status.message && (
          <div
            className={`rounded-lg p-4 flex items-center gap-3 ${
              status.type === "success"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p
              className={`text-sm ${
                status.type === "success" ? "text-green-800" : "text-red-800"
              }`}
            >
              {status.message}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || uploading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Send className="w-5 h-5" />
          {loading
            ? "Sending..."
            : targetLevel === "all"
            ? "Send to All Users"
            : `Send to ${targetLevel.toUpperCase()} Users`}
        </button>
      </form>
    </div>
  );
}
