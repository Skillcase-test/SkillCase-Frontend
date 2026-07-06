import React, { useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { uploadB1Flashcard } from "../../../../api/b1Api";

export default function B1FlashcardAdd() {
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
      return;
    }
    setUploadStatus("error:Please select a valid JSON file");
    setSelectedFile(null);
    setFileName("");
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

      const res = await uploadB1Flashcard(formData);
      if (res.data?.success) {
        setUploadStatus(`success:Upload successful! ${res.data.itemsInserted || 0} items inserted.`);
      } else {
        setUploadStatus("success:Upload finished.");
      }

      setTimeout(() => {
        setSelectedFile(null);
        setFileName("");
        setUploadStatus("");
      }, 3000);
    } catch (err) {
      console.error(err);
      setUploadStatus(
        "error:" +
          (err.response?.data?.error || "Upload failed. Please try again.")
      );
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
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-800 font-bold">
          Add B1 Flashcard Set
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Upload a JSON configuration file to add B1 flashcards.
        </p>
      </div>

      <div className="bg-white shadow-sm border border-slate-100 rounded-xl">
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Upload JSON File
            </label>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
              id="b1-flashcard-json-upload"
            />
            <label
              htmlFor="b1-flashcard-json-upload"
              className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition bg-gray-50"
            >
              <div className="text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  {fileName || "Click to upload JSON file"}
                </p>
                <p className="text-xs text-gray-500 mt-1">JSON only</p>
              </div>
            </label>
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
            onClick={handleSubmit}
            disabled={isUploading || !selectedFile}
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
                <span>Upload Content</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
