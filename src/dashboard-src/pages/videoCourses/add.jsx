import React, { useEffect, useRef, useState } from "react";
import { Upload, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { Link } from "react-router-dom";
import {
  getVideoCoursesAdmin,
  initVideoCourseUpload,
  completeVideoCourseUpload,
  getVideoCourseProcessingStatus,
} from "../../../api/videoCourseApi";
import toast, { Toaster } from "react-hot-toast";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "ALL"];

const inputClass =
  "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#002856]/5 focus:border-[#002856] transition-all";
const fileClass =
  "w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#eef2f6] file:text-[#002856] hover:file:bg-[#dfe6ef] border border-slate-200/60 rounded-xl p-1.5 bg-slate-50 cursor-pointer transition-colors";

export default function VideoCourseAdd() {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({
    course_id: "",
    title: "",
    description: "",
    proficiency_level: "A1",
    display_order: 0,
  });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    getVideoCoursesAdmin()
      .then((res) => setCourses(res.data?.data || []))
      .catch(() => toast.error("Failed to load courses"));

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const setField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setUploadStatus("");
    setUploadProgress(0);

    const tempUrl = URL.createObjectURL(file);
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.onloadedmetadata = () => {
      setVideoDuration(Math.round(vid.duration));
      URL.revokeObjectURL(tempUrl);
    };
    vid.src = tempUrl;
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setThumbnailFile(file);
      setUploadStatus("");
      return;
    }
    setUploadStatus("error:Please select a valid image file for the thumbnail");
    setThumbnailFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!videoFile) {
      toast.error("Video file is required.");
      return;
    }

    if (pollRef.current) clearInterval(pollRef.current);
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus("uploading:Initializing upload with server...");

    try {
      const initRes = await initVideoCourseUpload({
        contentType: videoFile.type || "video/mp4",
      });
      if (!initRes.data?.success) {
        throw new Error("Failed to initialize video upload with server.");
      }

      const { upload_url, s3_key } = initRes.data.data;
      setUploadStatus("uploading:Uploading video file to S3...");

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", upload_url, true);
        xhr.setRequestHeader("Content-Type", videoFile.type || "video/mp4");
        xhr.upload.onprogress = (evt) => {
          if (!evt.lengthComputable) return;
          const percent = Math.round((evt.loaded / evt.total) * 100);
          setUploadProgress(percent);
          setUploadStatus(`uploading:Uploading video to S3 — ${percent}%`);
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Failed to upload video file directly to S3. (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Network error while uploading video to S3."));
        xhr.send(videoFile);
      });

      setUploadStatus("uploading:Completing upload and saving metadata...");

      const completeData = new FormData();
      completeData.append("s3_key", s3_key);
      if (form.course_id) completeData.append("course_id", form.course_id);
      completeData.append("title", form.title);
      completeData.append("description", form.description);
      completeData.append("proficiency_level", form.proficiency_level);
      completeData.append("display_order", form.display_order || 0);
      completeData.append("video_duration", videoDuration || 0);
      if (thumbnailFile) completeData.append("thumbnail", thumbnailFile);

      const completeRes = await completeVideoCourseUpload(completeData);
      if (!completeRes.data?.success) {
        throw new Error("Failed to save video metadata on backend.");
      }

      const videoId = completeRes.data?.data?.video_id;

      // File upload complete - enable button for next video submission while polling continues
      setIsUploading(false);

      setForm({
        course_id: form.course_id,
        title: "",
        description: "",
        proficiency_level: form.proficiency_level,
        display_order: 0,
      });
      setVideoFile(null);
      setThumbnailFile(null);
      setVideoDuration(0);
      const vidInput = document.getElementById("course-video-file-input");
      if (vidInput) vidInput.value = "";
      const thumbInput = document.getElementById("course-thumb-file-input");
      if (thumbInput) thumbInput.value = "";

      if (videoId) {
        setUploadStatus("uploading:Queued for processing... You can safely leave this page; processing continues in the background.");
        let attempts = 0;
        const maxAttempts = 360;
        pollRef.current = setInterval(async () => {
          attempts++;
          try {
            const statusRes = await getVideoCourseProcessingStatus(videoId);
            const statusData = statusRes.data?.data;
            if (!statusData) return;

            const st = statusData.processing_status;
            const prg = statusData.processing_progress || 0;

            if (st === "pending") {
              setUploadStatus("uploading:Queued for processing... You can safely leave this page; processing continues in the background.");
            } else if (st === "processing") {
              setUploadStatus(`uploading:Generating transcript and Hindi/Kannada audio — ${prg}% (You can safely leave this page)`);
            } else if (st === "completed") {
              clearInterval(pollRef.current);
              setUploadStatus("success:Video processed. Hindi and Kannada audio are ready.");
              toast.success("Video processed successfully!");
            } else if (st === "failed") {
              clearInterval(pollRef.current);
              setUploadStatus(`error:Processing failed: ${statusData.processing_error || "Unknown error"}`);
            }
          } catch (pErr) {
            console.error("Polling error:", pErr);
          }

          if (attempts >= maxAttempts) {
            clearInterval(pollRef.current);
            setUploadStatus("error:Processing timed out. Please check the Manage page for status.");
          }
        }, 5000);
      } else {
        toast.success("Successfully uploaded course video!");
        setUploadStatus("success:Video uploaded successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error uploading video.");
      setUploadStatus("error:" + (err.message || "Error uploading video."));
      setIsUploading(false);
    }
  };

  const statusInfo = (() => {
    if (!uploadStatus) return null;
    const parts = uploadStatus.split(":");
    const type = parts[0];
    const message = parts.slice(1).join(":");
    const statusConfig = {
      success: { bg: "bg-[#eaf7f0]", border: "border-[#c3ebc6]", text: "text-[#1e7e34]", icon: CheckCircle },
      error: { bg: "bg-[#fff1f2]", border: "border-[#fecdd3]", text: "text-[#e11d48]", icon: AlertCircle },
      uploading: { bg: "bg-[#eef2f6]", border: "border-[#ccd9e8]", text: "text-[#002856]", icon: Loader },
    };
    return { type, message, config: statusConfig[type] };
  })();

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <Toaster position="top-center" />

      {/* Header card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800">Upload Course Video</h1>
          <p className="text-xs text-slate-400">
            Upload videos directly to S3 and attach them to a video course.
          </p>
        </div>
        <Link
          to="/admin/video-courses/manage"
          className="inline-flex items-center justify-center gap-2 self-start md:self-auto px-4 py-2.5 border border-slate-200 hover:border-[#002856] text-slate-600 hover:text-[#002856] font-bold text-xs rounded-xl bg-white hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Manage videos
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Course
              </label>
              <select
                value={form.course_id}
                onChange={setField("course_id")}
                className={inputClass}
              >
                <option value="">Unassigned</option>
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Proficiency Level
              </label>
              <select
                value={form.proficiency_level}
                onChange={setField("proficiency_level")}
                className={inputClass}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Title
            </label>
            <input value={form.title} onChange={setField("title")} className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={setField("description")}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Display Order
            </label>
            <input
              type="number"
              value={form.display_order}
              onChange={setField("display_order")}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Video File (.mp4)
            </label>
            <input
              id="course-video-file-input"
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              className={fileClass}
            />
            {videoDuration > 0 && (
              <p className="text-xs text-[#1e7e34] font-semibold mt-2">
                Duration detected: {Math.floor(videoDuration / 60)}m {videoDuration % 60}s
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Thumbnail Image (Optional)
            </label>
            <input
              id="course-thumb-file-input"
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              className={fileClass}
            />
          </div>

          {statusInfo && (
            <div
              className={`flex items-center gap-3 p-4 rounded-xl border ${statusInfo.config.bg} ${statusInfo.config.border}`}
            >
              <statusInfo.config.icon
                className={`w-5 h-5 flex-shrink-0 ${statusInfo.config.text} ${
                  statusInfo.type === "uploading" ? "animate-spin" : ""
                }`}
              />
              <span className={`text-xs font-semibold ${statusInfo.config.text}`}>
                {statusInfo.message}
              </span>
            </div>
          )}

          {isUploading && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#002856] h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading || !videoFile || !form.title.trim()}
            className="w-full bg-[#002856] text-white hover:bg-[#001e40] px-6 py-3 rounded-xl transition font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload Video</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
