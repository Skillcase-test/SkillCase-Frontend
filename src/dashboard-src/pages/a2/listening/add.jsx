import React, { useState } from "react";
import {
  Upload,
  FileText,
  Music,
  CheckCircle,
  AlertCircle,
  Loader,
  Download,
} from "lucide-react";
import { uploadA2Listening, getA2Template } from "../../../../api/a2Api";
export default function A2ListeningAdd() {
  const [jsonFile, setJsonFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [jsonFileName, setJsonFileName] = useState("");
  const [audioFileName, setAudioFileName] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const handleJsonChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/json") {
      setJsonFile(file);
      setJsonFileName(file.name);
      setUploadStatus("");
    } else {
      setUploadStatus("error:Please select a valid JSON file");
      setJsonFile(null);
      setJsonFileName("");
    }
  };
  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === "audio/mpeg" || file.type === "audio/mp3")) {
      setAudioFile(file);
      setAudioFileName(file.name);
    } else {
      setUploadStatus("error:Please select a valid MP3 file");
      setAudioFile(null);
      setAudioFileName("");
    }
  };
  const handleSubmit = async () => {
    if (!jsonFile) {
      setUploadStatus("error:Please select a JSON file");
      return;
    }
    setIsUploading(true);
    setUploadStatus("uploading:Uploading files...");
    try {
      const formData = new FormData();
      formData.append("file", jsonFile);
      if (audioFile) formData.append("audio", audioFile);
      await uploadA2Listening(formData);
      setUploadStatus("success:Upload successful!");
      setTimeout(() => {
        setJsonFile(null);
        setAudioFile(null);
        setJsonFileName("");
        setAudioFileName("");
        setUploadStatus("");
      }, 2000);
    } catch (err) {
      setUploadStatus(
        "error:" + (err.response?.data?.error || "Upload failed"),
      );
    } finally {
      setIsUploading(false);
    }
  };
  const handleDownloadTemplate = async () => {
    try {
      const res = await getA2Template("listening");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "a2_listening_template.json";
      a.click();
    } catch (err) {
      console.error(err);
    }
  };
  const getStatusInfo = () => {
    if (!uploadStatus) return null;
    const [type, message] = uploadStatus.split(":");
    const config = {
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
    return { type, message, config: config[type] };
  };
  const statusInfo = getStatusInfo();
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-800 font-bold">
          Add A2 Listening Content
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Upload JSON + Audio MP3 file
        </p>
      </div>
      <div className="bg-white shadow-xs rounded-xl">
        <div className="p-6 space-y-6">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>

          {/* JSON Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              JSON File (Required)
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleJsonChange}
              className="hidden"
              id="json-upload"
            />
            <label
              htmlFor="json-upload"
              className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 bg-gray-50"
            >
              <div className="text-center">
                <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm">
                  {jsonFileName || "Click to upload JSON"}
                </p>
              </div>
            </label>
          </div>
          {/* Audio Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Audio File (MP3)
            </label>
            <input
              type="file"
              accept=".mp3,audio/mpeg"
              onChange={handleAudioChange}
              className="hidden"
              id="audio-upload"
            />
            <label
              htmlFor="audio-upload"
              className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:border-green-500 bg-green-50"
            >
              <div className="text-center">
                <Music className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-green-700">
                  {audioFileName || "Click to upload MP3"}
                </p>
              </div>
            </label>
          </div>
          {statusInfo && (
            <div
              className={`flex items-center gap-3 p-4 rounded-lg border ${statusInfo.config.bg} ${statusInfo.config.border}`}
            >
              <statusInfo.config.icon
                className={`w-5 h-5 ${statusInfo.config.text} ${
                  statusInfo.type === "uploading" ? "animate-spin" : ""
                }`}
              />
              <span className={`text-sm font-medium ${statusInfo.config.text}`}>
                {statusInfo.message}
              </span>
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={isUploading || !jsonFile}
            className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload Content
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
