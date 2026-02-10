import React, { useState } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader,
  Download,
} from "lucide-react";
import { uploadA2Speaking, getA2Template } from "../../../../api/a2Api";
export default function A2SpeakingAdd() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file?.type === "application/json") {
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
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      await uploadA2Speaking(formData);
      setUploadStatus("success:Upload successful!");
      setTimeout(() => {
        setSelectedFile(null);
        setFileName("");
        setUploadStatus("");
      }, 2000);
    } catch (err) {
      setUploadStatus("error:" + (err.response?.data?.error || "Failed"));
    } finally {
      setIsUploading(false);
    }
  };
  const handleDownloadTemplate = async () => {
    try {
      const res = await getA2Template("speaking");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "a2_speaking_template.json";
      a.click();
    } catch (err) {}
  };
  const statusInfo = uploadStatus
    ? { type: uploadStatus.split(":")[0], message: uploadStatus.split(":")[1] }
    : null;
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Add A2 Speaking Content
        </h1>
      </div>
      <div className="bg-white shadow-xs rounded-xl p-6 space-y-6">
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg"
        >
          <Download className="w-4 h-4" />
          Download Template
        </button>
        <input
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
          id="json-upload"
        />
        <label
          htmlFor="json-upload"
          className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 bg-gray-50"
        >
          <div className="text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p>{fileName || "Click to upload JSON"}</p>
          </div>
        </label>
        {statusInfo && (
          <div
            className={`p-4 rounded-lg ${
              statusInfo.type === "success"
                ? "bg-green-50 text-green-700"
                : statusInfo.type === "error"
                ? "bg-red-50 text-red-700"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {statusInfo.message}
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={isUploading || !selectedFile}
          className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {isUploading ? "Processing..." : "Upload Content"}
        </button>
      </div>
    </div>
  );
}
