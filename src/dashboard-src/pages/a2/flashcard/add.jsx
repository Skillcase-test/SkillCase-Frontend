import React, { useState } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader,
  Download,
} from "lucide-react";
import { uploadA2Flashcard, getA2Template } from "../../../../api/a2Api";
export default function A2FlashcardAdd() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/json") {
      setSelectedFile(file);
      setFileName(file.name);
      setUploadStatus("");
    } else {
      setUploadStatus("error:Please select a valid JSON file");
      setSelectedFile(null);
      setFileName("");
    }
  };
  const handleSubmit = async () => {
    if (!selectedFile) {
      setUploadStatus("error:Please select a JSON file");
      return;
    }
    setIsUploading(true);
    setUploadStatus("uploading:Uploading file...");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      await uploadA2Flashcard(formData);
      setUploadStatus("success:Upload successful!");
      setIsUploading(false);
      setTimeout(() => {
        setSelectedFile(null);
        setFileName("");
        setUploadStatus("");
      }, 2000);
    } catch (err) {
      console.error(err);
      setUploadStatus(
        "error:" +
          (err.response?.data?.error || "Upload failed. Please try again."),
      );
      setIsUploading(false);
    }
  };
  const handleDownloadTemplate = async () => {
    try {
      const res = await getA2Template("flashcard");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "a2_flashcard_template.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download template:", err);
    }
  };
  const getStatusInfo = () => {
    if (!uploadStatus) return null;
    const [type, message] = uploadStatus.split(":");
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
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-800 font-bold">
          Add A2 Flashcard Set
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Upload JSON files to create new A2 flashcard chapters
        </p>
      </div>
      <div className="bg-white shadow-xs rounded-xl">
        <div className="p-6 space-y-6">
          {/* Download Template Button */}
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition"
          >
            <Download className="w-4 h-4" />
            <span>Download JSON Template</span>
          </button>
          {/* JSON Upload Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Upload JSON File
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
                id="json-upload"
              />
              <label
                htmlFor="json-upload"
                className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition bg-gray-50"
              >
                <div className="text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700">
                    {fileName || "Click to upload JSON file"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    JSON files only (Max 10MB)
                  </p>
                </div>
              </label>
            </div>
          </div>
          {/* Status Message */}
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
          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isUploading || !selectedFile}
            className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Upload Content</span>
              </>
            )}
          </button>
        </div>
      </div>
      {/* Info Card */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-semibold mb-1">JSON Format Requirements:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600">
              <li>chapter_name: string (required)</li>
              <li>description: string (optional)</li>
              <li>cards: array of card objects</li>
              <li>Each card: front_de, front_meaning, back_de, back_en</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
