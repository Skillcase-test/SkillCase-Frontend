import React, { useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { initB1VideoUpload, completeB1VideoUpload } from "../../../../api/b1Api";
import toast, { Toaster } from "react-hot-toast";

export default function B1VideoAdd() {
  const [jsonFile, setJsonFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleJsonChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/json") {
      setJsonFile(file);
      setUploadStatus("");
      return;
    }
    setUploadStatus("error:Please select a valid JSON file");
    setJsonFile(null);
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setUploadStatus("");

    // Auto-read duration from the video file
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
    if (!jsonFile) {
      toast.error("JSON metadata file is required.");
      return;
    }
    if (!videoFile) {
      toast.error("Video file is required.");
      return;
    }

    setIsUploading(true);
    setUploadStatus("uploading:Reading metadata JSON...");

    try {
      // 1. Read JSON file to parse metadata details
      const metadata = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            resolve(JSON.parse(event.target.result));
          } catch (err) {
            reject(new Error("Invalid JSON file format."));
          }
        };
        reader.onerror = () => reject(new Error("Failed to read JSON file."));
        reader.readAsText(jsonFile);
      });

      setUploadStatus("uploading:Initializing upload with server...");

      // 2. Initialize upload with backend
      const initRes = await initB1VideoUpload({
        title: metadata.title || jsonFile.name,
        contentType: videoFile.type || "video/mp4",
      });

      if (!initRes.data?.success) {
        throw new Error("Failed to initialize video upload with server.");
      }

      const { upload_url, s3_key } = initRes.data.data;
      setUploadStatus("uploading:Uploading video file to S3 (this may take a minute)...");

      // 3. Direct upload to AWS S3 using standard fetch PUT
      const uploadResponse = await fetch(upload_url, {
        method: "PUT",
        body: videoFile,
        headers: {
          "Content-Type": videoFile.type || "video/mp4",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload video file directly to S3.");
      }

      setUploadStatus("uploading:Completing upload and saving metadata...");

      // 4. Complete upload with backend metadata & thumbnail file
      const completeData = new FormData();
      completeData.append("s3_key", s3_key);
      completeData.append("title", metadata.title || jsonFile.name);
      completeData.append("transcript", metadata.transcript || "");
      completeData.append("video_duration", videoDuration || 0);
      completeData.append("display_order", metadata.display_order || 0);
      completeData.append("questions", JSON.stringify(metadata.questions || []));
      completeData.append("difficulty", metadata.difficulty || "Medium");
      if (thumbnailFile) {
        completeData.append("thumbnail", thumbnailFile);
      }

      const completeRes = await completeB1VideoUpload(completeData);
      if (completeRes.data?.success) {
        toast.success("Successfully uploaded video and metadata!");
        setUploadStatus("success:Video uploaded successfully!");
        setJsonFile(null);
        setVideoFile(null);
        setThumbnailFile(null);
        setVideoDuration(0);
        
        // Reset file input values programmatically
        const jsonInput = document.getElementById("json-file-input");
        if (jsonInput) jsonInput.value = "";
        const vidInput = document.getElementById("video-file-input");
        if (vidInput) vidInput.value = "";
        const thumbInput = document.getElementById("thumb-file-input");
        if (thumbInput) thumbInput.value = "";
      } else {
        throw new Error("Failed to save video metadata on backend.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error uploading video.");
      setUploadStatus("error:" + (err.message || "Error uploading video."));
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusInfo = () => {
    if (!uploadStatus) return null;
    const parts = uploadStatus.split(":");
    const type = parts[0];
    const message = parts.slice(1).join(":");
    
    const statusConfig = {
      success: {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-700",
        icon: CheckCircle,
      },
      error: {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        icon: AlertCircle,
      },
      uploading: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        icon: Loader,
      },
    };
    return { type, message, config: statusConfig[type] };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <Toaster position="top-center" />
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-800 font-bold">
          Upload B1 Video
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Upload B1 videos directly to S3 and save metadata from JSON.
        </p>
      </div>

      <div className="bg-white shadow-sm border border-slate-100 rounded-xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              JSON Metadata File
            </label>
            <input
              id="json-file-input"
              type="file"
              accept="application/json"
              onChange={handleJsonChange}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#002856] hover:file:bg-blue-100 border border-slate-150 rounded-lg p-1.5 bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Video File (.mp4)
            </label>
            <input
              id="video-file-input"
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#002856] hover:file:bg-blue-100 border border-slate-150 rounded-lg p-1.5 bg-slate-50/50"
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
              id="thumb-file-input"
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#002856] hover:file:bg-blue-100 border border-slate-150 rounded-lg p-1.5 bg-slate-50/50"
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

          <button
            type="submit"
            disabled={isUploading || !jsonFile || !videoFile}
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
                <span>Upload Video & Metadata</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
