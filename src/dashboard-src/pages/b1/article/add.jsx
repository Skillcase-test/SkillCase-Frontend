import React, { useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { uploadB1Reading } from "../../../../api/b1Api";
import toast, { Toaster } from "react-hot-toast";

export default function B1ArticleAdd() {
  const [jsonFile, setJsonFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
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

  const handleZipChange = (e) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "application/zip" || file.type === "application/x-zip-compressed" || file.name.endsWith(".zip"))) {
      setZipFile(file);
      setUploadStatus("");
      return;
    }
    setUploadStatus("error:Please select a valid ZIP archive");
    setZipFile(null);
  };

  const handleImagesChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const invalid = files.find((file) => !file.type.startsWith("image/"));
      if (invalid) {
        setUploadStatus("error:All loose files must be valid images");
        setImageFiles([]);
        return;
      }
      setImageFiles(files);
      setUploadStatus("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jsonFile) {
      toast.error("JSON metadata file is required.");
      return;
    }

    setIsUploading(true);
    setUploadStatus("uploading:Uploading B1 Article content...");

    try {
      const formData = new FormData();
      formData.append("file", jsonFile);
      if (zipFile) {
        formData.append("imagesZip", zipFile);
      }
      imageFiles.forEach((file) => {
        formData.append("images", file);
      });

      const res = await uploadB1Reading(formData);
      if (res.data?.success) {
        toast.success(`Successfully uploaded article content!`);
        setUploadStatus(`success:Upload successful! ${res.data.itemsInserted || 0} items inserted.`);
        setJsonFile(null);
        setZipFile(null);
        setImageFiles([]);
        
        const jsonInput = document.getElementById("json-file-input");
        if (jsonInput) jsonInput.value = "";
        const zipInput = document.getElementById("zip-file-input");
        if (zipInput) zipInput.value = "";
        const imgInput = document.getElementById("images-file-input");
        if (imgInput) imgInput.value = "";
      } else {
        toast.error("Upload failed.");
        setUploadStatus("error:Upload failed.");
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message || "Error uploading content.";
      toast.error(errMsg);
      setUploadStatus("error:" + errMsg);
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
          Add B1 Article Content
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Upload JSON configuration file along with a ZIP of images or loose image files for B1 Articles.
        </p>
      </div>

      <div className="bg-white shadow-sm border border-slate-100 rounded-xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              JSON Configuration File (Required)
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
              ZIP of Images (Optional)
            </label>
            <input
              id="zip-file-input"
              type="file"
              accept=".zip"
              onChange={handleZipChange}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#002856] hover:file:bg-blue-100 border border-slate-150 rounded-lg p-1.5 bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Loose Image Files (Optional)
            </label>
            <input
              id="images-file-input"
              type="file"
              multiple
              accept="image/*"
              onChange={handleImagesChange}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#002856] hover:file:bg-blue-100 border border-slate-150 rounded-lg p-1.5 bg-slate-50/50"
            />
            {imageFiles.length > 0 && (
              <p className="text-xs text-slate-500 mt-2 font-semibold">
                {imageFiles.length} file(s) selected
              </p>
            )}
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
            disabled={isUploading || !jsonFile}
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
        </form>
      </div>
    </div>
  );
}
