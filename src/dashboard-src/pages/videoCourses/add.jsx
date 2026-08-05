import React, { useEffect, useRef, useState } from "react";
import { Upload, CheckCircle, AlertCircle, Loader } from "lucide-react";
import {
  getVideoCoursesAdmin,
  initVideoCourseUpload,
  completeVideoCourseUpload,
  getVideoCourseProcessingStatus,
} from "../../../api/videoCourseApi";
import toast, { Toaster } from "react-hot-toast";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "ALL"];

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
  const [isProcessing, setIsProcessing] = useState(false);
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
    setIsProcessing(false);
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
        setIsProcessing(true);
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
              setIsProcessing(false);
              toast.success("Video processed successfully!");
            } else if (st === "failed") {
              clearInterval(pollRef.current);
              setUploadStatus(`error:Processing failed: ${statusData.processing_error || "Unknown error"}`);
              setIsProcessing(false);
            }
          } catch (pErr) {
            console.error("Polling error:", pErr);
          }

          if (attempts >= maxAttempts) {
            clearInterval(pollRef.current);
            setUploadStatus("error:Processing timed out. Please check the Manage page for status.");
            setIsProcessing(false);
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
      setIsProcessing(false);
    }
  };



  const statusInfo = (() => {
    if (!uploadStatus) return null;
    const parts = uploadStatus.split(":");
    const type = parts[0];
    const message = parts.slice(1).join(":");
    const statusConfig = {
      success: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", icon: CheckCircle },
      error: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: AlertCircle },
      uploading: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: Loader },
    };
    return { type, message, config: statusConfig[type] };
  })();

  const inputClass =
    "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-600";
  const fileClass =
    "w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#002856] hover:file:bg-blue-100 border border-slate-150 rounded-lg p-1.5 bg-slate-50/50";

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <Toaster position="top-center" />
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-800 font-bold">
          Upload Course Video
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Upload videos directly to S3 and attach them to a video course.
        </p>
      </div>

      <div className="bg-white shadow-sm border border-slate-100 rounded-xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
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
              <label className="block text-sm font-semibold text-gray-800 mb-2">
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
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Title
            </label>
            <input value={form.title} onChange={setField("title")} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
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
            <label className="block text-sm font-semibold text-gray-800 mb-2">
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
            <label className="block text-sm font-semibold text-gray-800 mb-2">
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
              <p className="text-xs text-green-700 font-semibold mt-2">
                Duration detected: {Math.floor(videoDuration / 60)}m {videoDuration % 60}s
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
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
              className={`flex items-center gap-3 p-4 rounded-lg border ${statusInfo.config.bg} ${statusInfo.config.border}`}
            >
              <statusInfo.config.icon
                className={`w-5 h-5 flex-shrink-0 ${statusInfo.config.text} ${
                  statusInfo.type === "uploading" ? "animate-spin" : ""
                }`}
              />
              <span className={`text-sm font-medium ${statusInfo.config.text}`}>
                {statusInfo.message}
              </span>
            </div>
          )}

          {isUploading && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading || !videoFile || !form.title.trim()}
            className="w-full bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-lg transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Upload Video</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
