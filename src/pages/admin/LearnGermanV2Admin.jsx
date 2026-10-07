import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import {
  ChevronUp,
  ChevronDown,
  Loader2,
  RefreshCw,
  Upload,
  FileText,
  Search,
  AlertTriangle,
  Sparkles,
  X,
  Trash2,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";

// Guided German (v2) content admin. Separate namespace from DynamicLessonAdmin
// because v2 topics carry subs JSONB (learn/learn-more/apply) instead of
// v1's screens[] — mixing the two uploads would corrupt the wrong table.
const formatBytes = (bytes) => {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

// Client-side shape check before the round-trip — the server still validates
// authoritatively (sub keys, step types, teaches triplets).
const validateCurriculumJson = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const topics = Array.isArray(data) ? data : data?.topics;
        if (!Array.isArray(topics) || topics.length === 0) {
          resolve("JSON must be an array of topics or { topics: [...] }");
          return;
        }
        for (const t of topics) {
          if (!t?.id) {
            resolve("Every topic needs an \"id\"");
            return;
          }
          if (!Array.isArray(t.subs) || t.subs.length === 0) {
            resolve(`Topic "${t.id}": subs must be a non-empty array`);
            return;
          }
        }
        resolve(null);
      } catch {
        resolve("Selected file is not valid JSON");
      }
    };
    reader.onerror = () => resolve("Could not read the selected file");
    reader.readAsText(file);
  });

function FileDropzone({ id, label, accept, hint, file, onSelect, error }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider"
      >
        {label}
      </label>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onSelect(f);
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed transition-all p-4 flex flex-col items-center justify-center text-center gap-1 ${
          dragging
            ? "border-[#002856] bg-[#eef2f6]"
            : "border-slate-200 bg-slate-50 hover:border-[#002856]/40"
        }`}
      >
        {file ? (
          <div
            className="flex w-full items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <FileText className="w-4 h-4 text-[#002856] flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-700 truncate flex-1 text-left">
              {file.name}
            </span>
            <span className="text-[10px] text-slate-400 flex-shrink-0">
              {formatBytes(file.size)}
            </span>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
              title="Remove file"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">
              Drop file here or{" "}
              <span className="text-[#002856] underline underline-offset-2">
                browse
              </span>
            </span>
            {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
          </>
        )}
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onSelect(f);
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#e11d48]">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function UploadSummary({ summary, onClose }) {
  if (!summary) return null;
  const missing = summary.imagesMissing || [];
  const skippedArt = summary.artSkipped || [];

  const stat = (label, value, colorClass) => (
    <div className="bg-white rounded-lg p-2.5 border border-slate-100">
      <span
        className={`block text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${colorClass}`}
      >
        {label}
      </span>
      <span className="text-base font-bold text-slate-800">{value}</span>
    </div>
  );

  return (
    <div className="mt-4 rounded-xl border border-[#ccd9e8] bg-[#eef2f6]/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-1.5 text-[10px] font-bold text-[#002856] uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Upload Summary
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
          aria-label="Dismiss summary"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {stat("Topics upserted", summary.topicsUpserted ?? 0, "text-[#1e7e34]")}
        {stat("Art uploaded", summary.artUploaded ?? 0, "text-[#1e7e34]")}
        {stat("Missing scenes", missing.length, "text-[#e11d48]")}
        {stat("Skipped files", skippedArt.length, "text-slate-500")}
      </div>
      {missing.length > 0 && (
        <div className="mt-3 bg-white rounded-lg p-3 border border-[#fecdd3] text-xs">
          <span className="font-bold text-[#e11d48] block mb-1">
            Scene/backdrop names with no uploaded art:
          </span>
          <ul className="list-disc pl-4 text-[#e11d48]/90 space-y-0.5">
            {missing.map((img, idx) => (
              <li key={idx} className="break-all">
                {img}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TopicRow({ topic, position, total, onMove, onToggle, onDelete, busy }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 bg-white">
      <span className="text-[10px] font-bold text-slate-400 w-6 flex-shrink-0 text-center">
        {position}
      </span>
      {topic.scene_image ? (
        <img
          src={topic.scene_image}
          alt=""
          className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-slate-100"
        />
      ) : (
        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-100 flex items-center justify-center flex-shrink-0 text-base">
          {topic.icon || <FileText className="w-3.5 h-3.5 text-slate-400" />}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-slate-700 truncate">
          {topic.title}
        </div>
        <div className="text-[10px] text-slate-400 truncate">
          {topic.topic_id} · {topic.sub_count ?? "—"} parts
          {topic.setting ? ` · ${topic.setting}` : ""}
        </div>
      </div>
      <button
        onClick={() => onToggle(topic)}
        disabled={busy}
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer disabled:opacity-40 ${
          topic.has_content
            ? "bg-[#eaf7f0] text-[#1e7e34] border-[#c3ebc6]"
            : "bg-slate-100 text-slate-500 border-slate-200"
        }`}
        title={topic.has_content ? "Live — click to unpublish" : "Draft — click to publish"}
      >
        {topic.has_content ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : (
          <XCircle className="w-3 h-3" />
        )}
        {topic.has_content ? "Live" : "Draft"}
      </button>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onMove(topic.topic_id, -1)}
          disabled={busy || position <= 1}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-[#002856] disabled:opacity-40 cursor-pointer"
          title="Move up"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => onMove(topic.topic_id, 1)}
          disabled={busy || position >= total}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-[#002856] disabled:opacity-40 cursor-pointer"
          title="Move down"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(topic)}
          disabled={busy}
          className="p-1.5 rounded-lg border border-[#fecdd3] text-[#e11d48] hover:bg-red-50 disabled:opacity-40 cursor-pointer"
          title="Delete topic (deletes learner progress too)"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function LearnGermanV2Admin() {
  const [topics, setTopics] = useState([]);
  const [art, setArt] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState("topics"); // topics | art

  const [jsonFile, setJsonFile] = useState(null);
  const [artZip, setArtZip] = useState(null);
  const [jsonError, setJsonError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [artSearch, setArtSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, a] = await Promise.all([
        api.get("/admin/learn-german-v2/topics"),
        api.get("/admin/learn-german-v2/art"),
      ]);
      setTopics(Array.isArray(t.data) ? t.data : []);
      setArt(Array.isArray(a.data) ? a.data : []);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load v2 content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleJsonSelect = (file) => {
    setJsonFile(file);
    setJsonError(null);
    if (file) validateCurriculumJson(file).then(setJsonError);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!jsonFile && !artZip) {
      toast.error("Pick a curriculum JSON and/or an art pack ZIP");
      return;
    }
    if (jsonError) {
      toast.error(jsonError);
      return;
    }
    const formData = new FormData();
    if (jsonFile) formData.append("file", jsonFile);
    if (artZip) formData.append("imagesZip", artZip);

    setUploading(true);
    setSummary(null);
    try {
      const res = await api.post("/admin/learn-german-v2/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Upload complete");
      setSummary(res.data?.uploadSummary || null);
      api.clearGetCache?.();
      setJsonFile(null);
      setArtZip(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Move locally, then persist the full order in one call — same net effect
  // as v1's reorder endpoint but the v2 API takes the whole id list.
  const moveTopic = async (topicId, dir) => {
    const idx = topics.findIndex((t) => t.topic_id === topicId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= topics.length) return;
    const next = topics.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    setTopics(next);
    setBusyId(topicId);
    try {
      await api.patch("/admin/learn-german-v2/topics/reorder", {
        orderedIds: next.map((t) => t.topic_id),
      });
      api.clearGetCache?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Reorder failed");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const toggleContent = async (topic) => {
    setBusyId(topic.topic_id);
    try {
      await api.patch(`/admin/learn-german-v2/topics/${topic.topic_id}`, {
        has_content: !topic.has_content,
      });
      api.clearGetCache?.();
      setTopics((ts) =>
        ts.map((t) =>
          t.topic_id === topic.topic_id
            ? { ...t, has_content: !t.has_content }
            : t,
        ),
      );
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const deleteTopic = async (topic) => {
    if (
      !window.confirm(
        `Delete "${topic.title}" (${topic.topic_id})?\n\nThis also deletes every learner's progress on this topic.`,
      )
    )
      return;
    setBusyId(topic.topic_id);
    try {
      await api.delete(`/admin/learn-german-v2/topics/${topic.topic_id}`);
      api.clearGetCache?.();
      setTopics((ts) => ts.filter((t) => t.topic_id !== topic.topic_id));
      toast.success("Topic deleted");
    } catch (err) {
      toast.error(err.response?.data?.error || "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const filteredArt = useMemo(() => {
    const q = artSearch.trim().toLowerCase();
    if (!q) return art;
    return art.filter((a) => a.name.toLowerCase().includes(q));
  }, [art, artSearch]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-[#002856]">
            Guided German (v2)
          </h1>
          <p className="text-xs text-slate-500">
            Curriculum JSON and art packs for the new Learn German experience.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-[#002856] disabled:opacity-40 cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Upload panel */}
      <form
        onSubmit={handleUpload}
        className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
      >
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Upload content
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FileDropzone
            id="lg2-json"
            label="Curriculum JSON"
            accept=".json,application/json"
            file={jsonFile}
            onSelect={handleJsonSelect}
            error={jsonError}
            hint="Array of topics, or { topics: [...] }"
          />
          <FileDropzone
            id="lg2-artzip"
            label="Art pack ZIP"
            accept=".zip,application/zip"
            file={artZip}
            onSelect={setArtZip}
            hint="Images upload to S3 and register by filename"
          />
        </div>
        <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          Both are optional and independent. Topics upsert by id — existing
          learner progress is preserved.
        </p>
        <button
          type="submit"
          disabled={uploading || (!jsonFile && !artZip) || !!jsonError}
          className="w-full bg-[#002856] text-white py-2.5 rounded-xl hover:bg-[#001e40] disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs transition-colors cursor-pointer"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
        <UploadSummary summary={summary} onClose={() => setSummary(null)} />
      </form>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {["topics", "art"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              tab === t
                ? "bg-[#002856] text-white"
                : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t === "topics" ? `Topics (${topics.length})` : `Art (${art.length})`}
          </button>
        ))}
      </div>

      {tab === "topics" ? (
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading topics…
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center text-sm text-slate-400 py-10">
              No topics yet — upload a curriculum JSON.
            </div>
          ) : (
            topics.map((topic, i) => (
              <TopicRow
                key={topic.topic_id}
                topic={topic}
                position={i + 1}
                total={topics.length}
                onMove={moveTopic}
                onToggle={toggleContent}
                onDelete={deleteTopic}
                busy={busyId === topic.topic_id}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={artSearch}
              onChange={(e) => setArtSearch(e.target.value)}
              placeholder="Search art names (tile-Kaffee, scene-cafe…)"
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#002856]/20 focus:border-[#002856]"
            />
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading art…
            </div>
          ) : filteredArt.length === 0 ? (
            <div className="text-center text-sm text-slate-400 py-10">
              {art.length === 0
                ? "No art uploaded yet — upload an art pack ZIP."
                : "No art matches that search."}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {filteredArt.map((a) => (
                <div
                  key={a.name}
                  className="rounded-xl border border-slate-200 bg-white p-2"
                >
                  {a.url ? (
                    <img
                      src={a.url}
                      alt={a.name}
                      loading="lazy"
                      className="w-full h-20 object-cover rounded-lg bg-slate-50"
                    />
                  ) : (
                    <div className="w-full h-20 rounded-lg bg-slate-100 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-slate-300" />
                    </div>
                  )}
                  <div className="mt-1.5 text-[10px] font-semibold text-slate-600 break-all leading-tight">
                    {a.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
